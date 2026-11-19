import 'dart:math' as math;

import 'package:uuid/uuid.dart';

import '../../../core/local/local_operation.dart';
import '../../../core/local/local_store.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/connection_monitor.dart';
import '../domain/local_work_orders.dart';
import '../domain/work_order.dart';
import '../domain/work_order_repository.dart';
import 'work_order_codec.dart';

class OfflineWorkOrderRepository
    implements WorkOrderRepository, LocalWorkOrders {
  OfflineWorkOrderRepository(
      {required this.remote,
      required this.store,
      required this.connection,
      this.checkAccess});
  final WorkOrderRepository remote;
  final LocalStore store;
  final ConnectionMonitor connection;
  final Future<void> Function(String user)? checkAccess;
  Future<void> _writes = Future.value();
  @override
  bool get isDemo => false;
  @override
  bool get offline => connection.offline;
  @override
  Stream<void> get connectionChanges => connection.changes;
  @override
  Future<void> recheckConnection() => connection.recheck();

  Future<CachedValue> _read(String user, String kind, String key,
      Future<Map<String, Object?>> Function() fetch) async {
    if (!offline) {
      try {
        final data = await fetch();
        await store.put(user, kind, key, data);
        return CachedValue({...data, '_live': true}, DateTime.now().toUtc());
      } on ApiException catch (e) {
        if (!e.isConnectionFailure) rethrow;
        connection.setOffline(true);
      }
    }
    await checkAccess?.call(user);
    final cached = await store.read(user, kind, key);
    if (cached == null) {
      throw const WorkOrderValidation(
          'Chưa có dữ liệu trên máy. Kết nối mạng và tải mục này trước.');
    }
    return cached;
  }

  DateTime? _cachedAt(CachedValue c) =>
      c.data['_live'] == true ? null : c.savedAt;
  Map<String, Object?> _page<T>(
          ResultPage<T> p, Map<String, Object?> Function(T) encode) =>
      {
        'items': p.items.map(encode).toList(),
        'page': p.page,
        'totalPages': p.totalPages,
        'total': p.total
      };

  Future<WorkOrder> _overlay(String user, WorkOrder w) async {
    final projection = await store.read(user, 'projection', w.id);
    if (projection != null) {
      return decodeOrder(projection.data, cachedAt: w.cachedAt);
    }
    if (w.cachedAt != null) {
      final detail = await store.read(user, 'order', w.id);
      if (detail != null && detail.savedAt.isAfter(w.cachedAt!)) {
        return decodeOrder(detail.data, cachedAt: detail.savedAt);
      }
    }
    return w;
  }

  @override
  Future<ResultPage<WorkOrder>> assigned(String technicianId,
      {WorkOrderPriority? priority, int page = 1}) async {
    CachedValue c;
    try {
      c = await _read(
          technicianId,
          'assigned',
          '${priority?.name ?? 'all'}:$page',
          () async => _page(
              await remote.assigned(technicianId,
                  priority: priority, page: page),
              encodeOrder));
    } on WorkOrderValidation {
      final pages = await store.all(technicianId, 'assigned');
      if (pages.isEmpty) rethrow;
      final known = <String, dynamic>{};
      for (final p in pages) {
        for (final w in p.data['items'] as List) {
          if (priority == null || w['priority'] == priority.name) {
            known[w['id']] = w;
          }
        }
      }
      final values = known.values.toList();
      c = CachedValue({
        'items': values.skip((page - 1) * 20).take(20).toList(),
        'page': page,
        'totalPages': (values.length / 20).ceil(),
        'total': values.length
      }, pages.first.savedAt);
    }
    final items = <WorkOrder>[];
    for (final raw in c.data['items'] as List) {
      items.add(await _overlay(
          technicianId, decodeOrder(raw, cachedAt: _cachedAt(c))));
    }
    return ResultPage(
        items: items,
        page: page,
        totalPages: c.data['totalPages'],
        total: c.data['total'],
        cachedAt: _cachedAt(c));
  }

  @override
  Future<WorkOrder> detail(String id, String technicianId) async {
    try {
      final c = await _read(technicianId, 'order', id,
          () async => encodeOrder(await remote.detail(id, technicianId)));
      return await _overlay(
          technicianId, decodeOrder(c.data, cachedAt: _cachedAt(c)));
    } on ApiException catch (e) {
      if ([401, 403, 404].contains(e.statusCode)) {
        await store.invalidateWork(technicianId, id);
      }
      rethrow;
    }
  }

  @override
  Future<ResultPage<StockPart>> parts(String technicianId,
      {String search = '', int page = 1}) async {
    CachedValue c;
    try {
      c = await _read(
          technicianId,
          'parts',
          '${search.trim()}:$page',
          () async => _page(
              await remote.parts(technicianId, search: search, page: page),
              encodePart));
    } on WorkOrderValidation {
      final pages = await store.all(technicianId, 'parts');
      if (pages.isEmpty) rethrow;
      final known = <String, dynamic>{};
      for (final p in pages) {
        for (final part in p.data['items'] as List) {
          final text = '${part['code']} ${part['name']}';
          if (text.toLowerCase().contains(search.trim().toLowerCase())) {
            known[part['id']] = part;
          }
        }
      }
      final values = known.values.toList();
      c = CachedValue({
        'items': values.skip((page - 1) * 20).take(20).toList(),
        'total': values.length,
        'totalPages': (values.length / 20).ceil()
      }, pages.first.savedAt);
    }
    return ResultPage(
        items: (c.data['items'] as List).map((p) => decodePart(p)).toList(),
        page: page,
        total: c.data['total'],
        totalPages: c.data['totalPages'],
        cachedAt: _cachedAt(c));
  }

  @override
  Future<ResultPage<MaterialRequest>> materials(
      String workOrderId, String technicianId,
      {MaterialStatus? status, int page = 1}) async {
    CachedValue c;
    try {
      c = await _read(
          technicianId,
          'materials',
          'materials:$workOrderId:${status?.name ?? 'all'}:$page',
          () async => _page(
              await remote.materials(workOrderId, technicianId,
                  status: status, page: page),
              encodeMaterial));
    } on WorkOrderValidation {
      final all = await store.read(
          technicianId, 'materials', 'materials:$workOrderId:all:1');
      if (page != 1 ||
          status == null ||
          all == null ||
          (all.data['totalPages'] as int) > 1) {
        rethrow;
      }
      final filtered = (all.data['items'] as List)
          .where((r) => r['status'] == status.name)
          .toList();
      c = CachedValue({
        'items': filtered,
        'total': filtered.length,
        'totalPages': filtered.isEmpty ? 0 : 1
      }, all.savedAt);
    }
    if (_cachedAt(c) != null && status != null) {
      final all = await store.read(
          technicianId, 'materials', 'materials:$workOrderId:all:1');
      if (all != null &&
          (all.data['totalPages'] as int) <= 1 &&
          all.savedAt.isAfter(c.savedAt)) {
        final filtered = (all.data['items'] as List)
            .where((r) => r['status'] == status.name)
            .toList();
        c = CachedValue({
          'items': filtered,
          'total': filtered.length,
          'totalPages': filtered.isEmpty ? 0 : 1
        }, all.savedAt);
      }
    }
    final local = await store.localMaterials(technicianId, workOrderId);
    final merged = <String, MaterialRequest>{
      for (final raw in c.data['items'] as List) raw['id']: decodeMaterial(raw)
    };
    var delta = 0;
    for (final raw in local) {
      final request = decodeMaterial(raw);
      if (page == 1 || merged.containsKey(request.id)) {
        merged[request.id] = request;
      }
      if (raw['_serverRequest'] == true) {
        if (status == MaterialStatus.pending &&
            request.status != MaterialStatus.pending) {
          delta--;
        }
      } else if (status == null || request.status == status) {
        delta++;
      }
    }
    return ResultPage(
        items: merged.values
            .where((r) => status == null || r.status == status)
            .toList(),
        page: page,
        total: math.max(0, (c.data['total'] as int) + delta),
        totalPages: c.data['totalPages'],
        cachedAt: _cachedAt(c));
  }

  Future<T> _serial<T>(Future<T> Function() action) {
    final result = _writes.then((_) => action());
    _writes = result.then<void>((_) {}, onError: (Object _, StackTrace __) {});
    return result;
  }

  Future<WorkOrder> _current(WorkOrder supplied, String user) async {
    await checkAccess?.call(user);
    final snapshot = await store.read(user, 'order', supplied.id);
    if (snapshot == null) {
      throw const WorkOrderValidation(
          'Tải chi tiết công việc khi có mạng trước khi thao tác offline.');
    }
    final current = await _overlay(
        user, decodeOrder(snapshot.data, cachedAt: snapshot.savedAt));
    if (current.technicianId != user) {
      throw const WorkOrderValidation('Bạn không được giao công việc này.');
    }
    return current;
  }

  Future<bool> _queueNeeded(String user, String id) async =>
      offline || await store.read(user, 'projection', id) != null;

  Future<void> _enqueue(String user, WorkOrder current, WorkOrder projected,
      String type, Map<String, dynamic> payload,
      {Map<String, Object?>? material,
      bool clearMaterialDraft = false,
      bool clearReportDraft = false}) async {
    final previous = (await store.operations(user))
        .where((op) => op.targetId == current.id && op.status == 'PENDING')
        .toList();
    final base = await store.read(user, 'order', current.id);
    final saved = clearMaterialDraft ? await loadDraft(user, current.id) : null;
    final updatedDraft = saved == null
        ? null
        : encodeDraft(SavedWorkDraft(
            report: saved.report, material: const MaterialDraft(parts: [])));
    await store.enqueue(
        user,
        LocalOperation(
            uuid: const Uuid().v4(),
            type: type,
            targetId: current.id,
            createdAt: DateTime.now().toUtc(),
            payload: {
              ...payload,
              'workOrderCode': current.code,
              'baseStatus': base?.data['status'],
              'baseFetchedAt': base?.savedAt.toIso8601String(),
              if (previous.isNotEmpty) 'dependsOn': previous.last.uuid
            }),
        encodeOrder(projected.copyWith(pendingSync: true)),
        material: material,
        updatedDraft: updatedDraft,
        deleteDraft: clearReportDraft);
  }

  @override
  Future<WorkOrder> start(WorkOrder order, String technicianId) =>
      _serial(() async {
        if (!await _queueNeeded(technicianId, order.id)) {
          final result = await remote.start(order, technicianId);
          await store.put(technicianId, 'order', order.id, encodeOrder(result));
          return result;
        }
        final current = await _current(order, technicianId);
        if (!current.canStart(technicianId)) {
          throw const WorkOrderValidation(
              'Công việc không thể bắt đầu ở trạng thái này.');
        }
        final updated = current.copyWith(
            status: WorkOrderStatus.inProgress,
            startedAt: current.startedAt ?? DateTime.now().toUtc(),
            pendingSync: true);
        await _enqueue(
            technicianId,
            current,
            updated,
            current.status == WorkOrderStatus.onHold
                ? 'RESUME_WORK_ORDER'
                : 'START_WORK_ORDER',
            {'fromStatus': current.status.name});
        return updated;
      });

  @override
  Future<WorkOrder> pause(
          WorkOrder order, String reason, String technicianId) =>
      _serial(() async {
        if (!await _queueNeeded(technicianId, order.id)) {
          final result = await remote.pause(order, reason, technicianId);
          await store.put(technicianId, 'order', order.id, encodeOrder(result));
          return result;
        }
        final current = await _current(order, technicianId);
        _reason(reason);
        if (!current.canComplete(technicianId)) {
          throw const WorkOrderValidation(
              'Chỉ tạm dừng công việc đang thực hiện.');
        }
        final updated =
            current.copyWith(status: WorkOrderStatus.onHold, pendingSync: true);
        await _enqueue(technicianId, current, updated, 'PAUSE_WORK_ORDER',
            {'reason': reason.trim()});
        return updated;
      });

  @override
  Future<WorkOrder> complete(
          WorkOrder order, CompletionDraft draft, String technicianId) =>
      _serial(() async {
        if (!await _queueNeeded(technicianId, order.id)) {
          final result = await remote.complete(order, draft, technicianId);
          await store.put(technicianId, 'order', order.id, encodeOrder(result));
          return result;
        }
        final current = await _current(order, technicianId);
        draft.validate();
        if (!current.canComplete(technicianId)) {
          throw const WorkOrderValidation(
              'Công việc phải đang thực hiện mới được hoàn thành.');
        }
        final pending = await materials(order.id, technicianId,
            status: MaterialStatus.pending);
        if (pending.total > 0) {
          throw const WorkOrderValidation(
              'Còn yêu cầu vật tư chờ duyệt. Chưa thể ghi hoàn thành.');
        }
        final updated = current.copyWith(
            status: WorkOrderStatus.completed,
            completedAt: DateTime.now().toUtc(),
            rootCause: draft.rootCause.trim(),
            solution: draft.solution.trim(),
            completionNotes: draft.notes.trim(),
            pendingSync: true);
        await _enqueue(
            technicianId,
            current,
            updated,
            'COMPLETE_WORK_ORDER',
            {
              'rootCause': draft.rootCause.trim(),
              'solution': draft.solution.trim(),
              'completionNotes': draft.notes.trim()
            },
            clearReportDraft: true);
        return updated;
      });

  @override
  Future<MaterialRequest> requestMaterials(
          WorkOrder order, MaterialDraft draft, String technicianId) =>
      _serial(() async {
        if (!await _queueNeeded(technicianId, order.id)) {
          draft.validate();
          final saved = await loadDraft(technicianId, order.id);
          final report = saved?.report ??
              const CompletionDraft(rootCause: '', solution: '');
          // Persist BEFORE the non-idempotent POST. A process kill at any
          // later point must restore a "review server result" guard.
          await saveDraft(
              technicianId,
              order.id,
              SavedWorkDraft(
                  report: report, material: draft, reviewRequired: true));
          final result =
              await remote.requestMaterials(order, draft, technicianId);
          await saveDraft(
              technicianId,
              order.id,
              SavedWorkDraft(
                  report: report, material: const MaterialDraft(parts: [])));
          return result;
        }
        final current = await _current(order, technicianId);
        draft.validate();
        if (!current.canRequestMaterials(technicianId)) {
          throw const WorkOrderValidation(
              'Bắt đầu công việc trước khi yêu cầu vật tư.');
        }
        final request = MaterialRequest(
            id: const Uuid().v4(),
            workOrderId: order.id,
            requestedById: technicianId,
            status: MaterialStatus.pending,
            notes: draft.notes.trim(),
            createdAt: DateTime.now().toUtc(),
            pendingSync: true,
            items: draft.parts
                .map((p) => UsedPart(
                    partId: p.part.id,
                    code: p.part.code,
                    name: p.part.name,
                    unit: p.part.unit,
                    quantity: p.quantity))
                .toList());
        await _enqueue(
            technicianId,
            current,
            current,
            'REQUEST_MATERIALS',
            {
              'localRequestId': request.id,
              'items': draft.parts
                  .map((p) => {'partId': p.part.id, 'quantity': p.quantity})
                  .toList(),
              'notes': draft.notes.trim()
            },
            material: encodeMaterial(request),
            clearMaterialDraft: true);
        return request;
      });

  @override
  Future<MaterialRequest> cancelMaterial(
          MaterialRequest request, String reason, String technicianId) =>
      _serial(() async {
        if (!await _queueNeeded(technicianId, request.workOrderId)) {
          return remote.cancelMaterial(request, reason, technicianId);
        }
        _reason(reason);
        if (request.requestedById != technicianId ||
            request.status != MaterialStatus.pending) {
          throw const WorkOrderValidation(
              'Chỉ hủy yêu cầu đang chờ do bạn gửi.');
        }
        final base =
            await store.read(technicianId, 'order', request.workOrderId);
        if (base == null) {
          throw const WorkOrderValidation('Chưa tải công việc này.');
        }
        final current = await _current(decodeOrder(base.data), technicianId);
        final local =
            await store.read(technicianId, 'local_material', request.id);
        final updated = request.cancelled(reason.trim());
        final encoded = {
          ...encodeMaterial(updated),
          'pendingSync': true,
          '_serverRequest':
              local?.data['_serverRequest'] == true || !request.pendingSync
        };
        await _enqueue(
            technicianId,
            current,
            current,
            'CANCEL_MATERIAL_REQUEST',
            {
              'requestId': request.id,
              'localRequest': request.pendingSync,
              'reason': reason.trim()
            },
            material: encoded);
        return decodeMaterial(encoded);
      });

  void _reason(String reason) {
    if (reason.trim().isEmpty || reason.trim().length > 1000) {
      throw const WorkOrderValidation('Nhập lý do từ 1 đến 1000 ký tự.');
    }
  }

  @override
  Future<MaterialRequest> materialDetail(
      MaterialRequest request, String technicianId) async {
    await checkAccess?.call(technicianId);
    final local = await store.read(technicianId, 'local_material', request.id);
    if (local != null) return decodeMaterial(local.data);
    final c = await _read(
        technicianId,
        'material_detail',
        request.id,
        () async =>
            encodeMaterial(await remote.materialDetail(request, technicianId)));
    return decodeMaterial(c.data);
  }

  @override
  Future<SavedWorkDraft?> loadDraft(String user, String workId) async {
    await checkAccess?.call(user);
    final c = await store.read(user, 'draft', workId);
    return c == null ? null : decodeDraft(c.data);
  }

  @override
  Future<void> saveDraft(String user, String workId, SavedWorkDraft draft) =>
      store.put(user, 'draft', workId, encodeDraft(draft));
  @override
  Future<void> deleteDraft(String user, String workId) =>
      store.remove(user, 'draft', workId);
  @override
  Future<List<LocalOperation>> queuedOperations(String user) async {
    await checkAccess?.call(user);
    return store.operations(user);
  }
}
