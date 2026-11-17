import 'package:uuid/uuid.dart';

import '../../../core/network/api_client.dart';
import '../domain/work_order.dart';
import '../domain/work_order_repository.dart';

class DemoWorkOrderRepository implements WorkOrderRepository {
  final _sessions = <String, _DemoSession>{};
  @override
  bool get isDemo => true;
  _DemoSession _session(String user) =>
      _sessions.putIfAbsent(user, () => _DemoSession(user));
  @override
  Future<ResultPage<WorkOrder>> assigned(String technicianId,
      {WorkOrderPriority? priority, int page = 1}) async {
    final items = _session(technicianId)
        .orders
        .values
        .where((order) => priority == null || order.priority == priority)
        .toList()
      ..sort((a, b) {
        final rank = a.priority.index.compareTo(b.priority.index);
        return rank != 0 ? rank : a.code.compareTo(b.code);
      });
    return _page(items, page);
  }

  @override
  Future<WorkOrder> detail(String id, String technicianId) async =>
      _get(id, technicianId);
  WorkOrder _get(String id, String user) {
    final order = _session(user).orders[id];
    if (order == null || order.technicianId != user) {
      throw const ApiException('Không tìm thấy công việc được giao.',
          statusCode: 404);
    }
    return order;
  }

  @override
  Future<WorkOrder> start(WorkOrder order, String technicianId) async {
    final current = _get(order.id, technicianId);
    if (!current.canStart(technicianId)) {
      throw const ApiException('Trạng thái công việc đã thay đổi. Hãy tải lại.',
          statusCode: 409);
    }
    final updated = current.copyWith(
        status: WorkOrderStatus.inProgress,
        startedAt: current.startedAt ?? DateTime.now());
    _session(technicianId).orders[order.id] = updated;
    _session(technicianId).runningSince[order.id] = DateTime.now();
    return updated;
  }

  @override
  Future<WorkOrder> complete(
      WorkOrder order, CompletionDraft draft, String technicianId) async {
    final session = _session(technicianId),
        current = _get(order.id, technicianId);
    if (!current.canComplete(technicianId)) {
      throw const ApiException('Trạng thái công việc đã thay đổi. Hãy tải lại.',
          statusCode: 409);
    }
    draft.validate();
    if (session.requests.values.any((r) =>
        r.workOrderId == order.id && r.status == MaterialStatus.pending)) {
      throw const ApiException(
          'Còn yêu cầu vật tư chờ duyệt. Hãy xử lý trước khi hoàn thành.',
          statusCode: 409);
    }
    final updated = current.copyWith(
        status: WorkOrderStatus.completed,
        completedAt: DateTime.now(),
        completionNotes: draft.notes.trim(),
        rootCause: draft.rootCause.trim(),
        solution: draft.solution.trim(),
        actualHours: ((session.activeSeconds[order.id] ?? 0) +
                DateTime.now()
                    .difference(session.runningSince[order.id] ??
                        current.startedAt ??
                        DateTime.now())
                    .inSeconds) /
            3600);
    session.orders[order.id] = updated;
    return updated;
  }

  @override
  Future<WorkOrder> pause(
      WorkOrder order, String reason, String technicianId) async {
    final current = _get(order.id, technicianId);
    if (!current.canComplete(technicianId) ||
        reason.trim().isEmpty ||
        reason.trim().length > 1000) {
      throw const WorkOrderValidation('Nhập lý do tạm dừng hợp lệ.');
    }
    final updated = current.copyWith(status: WorkOrderStatus.onHold);
    final session = _session(technicianId);
    session.activeSeconds[order.id] = (session.activeSeconds[order.id] ?? 0) +
        DateTime.now()
            .difference(session.runningSince.remove(order.id) ??
                current.startedAt ??
                DateTime.now())
            .inSeconds;
    _session(technicianId).orders[order.id] = updated;
    return updated;
  }

  @override
  Future<ResultPage<MaterialRequest>> materials(
      String workOrderId, String technicianId,
      {MaterialStatus? status, int page = 1}) async {
    _get(workOrderId, technicianId);
    return _page(
        _session(technicianId)
            .requests
            .values
            .where((r) =>
                r.workOrderId == workOrderId &&
                (status == null || r.status == status))
            .toList()
            .reversed
            .toList(),
        page);
  }

  @override
  Future<MaterialRequest> requestMaterials(
      WorkOrder order, MaterialDraft draft, String technicianId) async {
    final current = _get(order.id, technicianId);
    if (!current.canRequestMaterials(technicianId)) {
      throw const WorkOrderValidation(
          'Công việc chưa bắt đầu hoặc đã kết thúc.');
    }
    draft.validate();
    final request = MaterialRequest(
        id: const Uuid().v4(),
        workOrderId: order.id,
        requestedById: technicianId,
        status: MaterialStatus.pending,
        notes: draft.notes.trim(),
        createdAt: DateTime.now(),
        items: List.unmodifiable(draft.parts.map((p) => UsedPart(
            partId: p.part.id,
            code: p.part.code,
            name: p.part.name,
            unit: p.part.unit,
            quantity: p.quantity))));
    _session(technicianId).requests[request.id] = request;
    return request;
  }

  @override
  Future<MaterialRequest> materialDetail(
      MaterialRequest request, String technicianId) async {
    final current = _session(technicianId).requests[request.id];
    if (current == null || current.requestedById != technicianId) {
      throw const ApiException('Không tìm thấy yêu cầu.', statusCode: 404);
    }
    return current;
  }

  @override
  Future<MaterialRequest> cancelMaterial(
      MaterialRequest request, String reason, String technicianId) async {
    final current = await materialDetail(request, technicianId);
    if (current.status != MaterialStatus.pending ||
        reason.trim().isEmpty ||
        reason.trim().length > 1000) {
      throw const WorkOrderValidation(
          'Yêu cầu không còn chờ hoặc lý do chưa hợp lệ.');
    }
    final updated = current.cancelled(reason.trim());
    _session(technicianId).requests[request.id] = updated;
    return updated;
  }

  @override
  Future<ResultPage<StockPart>> parts(String technicianId,
      {String search = '', int page = 1}) async {
    final query = search.trim().toLowerCase();
    return _page(
        _session(technicianId)
            .stock
            .values
            .where((part) =>
                '${part.code} ${part.name}'.toLowerCase().contains(query))
            .toList(),
        page);
  }

  ResultPage<T> _page<T>(List<T> all, int page) {
    if (page < 1) throw const WorkOrderValidation('Trang không hợp lệ.');
    return ResultPage(
        items: List.unmodifiable(all.skip((page - 1) * 20).take(20)),
        page: page,
        totalPages: (all.length / 20).ceil(),
        total: all.length);
  }
}

class _DemoSession {
  _DemoSession(String user) {
    const uuid = Uuid();
    for (final part in [
      StockPart(
          id: uuid.v4(),
          code: 'PART-DEMO-001',
          name: 'Vòng bi 6205',
          unit: 'Cái',
          stock: 12),
      StockPart(
          id: uuid.v4(),
          code: 'PART-DEMO-002',
          name: 'Bộ phớt bơm',
          unit: 'Bộ',
          stock: 4),
      StockPart(
          id: uuid.v4(),
          code: 'PART-DEMO-003',
          name: 'Cảm biến áp suất',
          unit: 'Cái',
          stock: 0),
    ]) {
      stock[part.id] = part;
    }
    final priorities = [
      WorkOrderPriority.critical,
      WorkOrderPriority.high,
      WorkOrderPriority.medium,
      WorkOrderPriority.low,
      WorkOrderPriority.high
    ];
    final titles = [
      'Kiểm tra máy bơm dừng đột ngột',
      'Xử lý rò dầu tại cụm bơm',
      'Thay vòng bi truyền động',
      'Kiểm tra tủ điều khiển',
      'Vệ sinh lọc dầu định kỳ'
    ];
    for (var i = 0; i < titles.length; i++) {
      final order = WorkOrder(
          id: uuid.v4(),
          code: 'WO-DEMO-00${i + 1}',
          title: titles[i],
          assetId: uuid.v4(),
          assetCode: 'AST-DEMO-00${i + 1}',
          assetName: i == 3 ? 'Tủ điều khiển mẫu' : 'Máy bơm mẫu ${i + 1}',
          technicianId: user,
          priority: priorities[i],
          status: i == 2
              ? WorkOrderStatus.inProgress
              : i == 4
                  ? WorkOrderStatus.completed
                  : WorkOrderStatus.assigned,
          description:
              'Dữ liệu mẫu phục vụ kiểm thử mobile. Kiểm tra thiết bị và ghi rõ biện pháp xử lý.',
          scheduledEnd: DateTime.now().add(Duration(days: i)),
          startedAt: i == 2 || i == 4
              ? DateTime.now().subtract(const Duration(hours: 1))
              : null,
          completedAt: i == 4 ? DateTime.now() : null,
          completionNotes:
              i == 4 ? 'Đã vệ sinh lọc và kiểm tra lại áp suất.' : null,
          rootCause: i == 4 ? 'Lọc dầu bẩn' : null,
          solution: i == 4 ? 'Vệ sinh lọc và kiểm tra áp suất' : null,
          actualHours: i == 4 ? 0.75 : 0);
      orders[order.id] = order;
    }
  }
  final orders = <String, WorkOrder>{};
  final stock = <String, StockPart>{};
  final requests = <String, MaterialRequest>{};
  final activeSeconds = <String, int>{};
  final runningSince = <String, DateTime>{};
}
