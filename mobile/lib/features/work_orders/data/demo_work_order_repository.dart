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
        status: WorkOrderStatus.inProgress, startedAt: DateTime.now());
    _session(technicianId).orders[order.id] = updated;
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
    for (final selection in draft.parts) {
      final stored = session.stock[selection.part.id];
      if (stored == null || selection.quantity > stored.stock) {
        throw const ApiException(
            'Tồn kho đã thay đổi. Hãy cập nhật danh sách phụ tùng.',
            statusCode: 422);
      }
    }
    // Validate everything before committing the in-memory demo transaction.
    final used = <UsedPart>[];
    for (final selection in draft.parts) {
      final stored = session.stock[selection.part.id]!;
      used.add(UsedPart(
          partId: stored.id,
          code: stored.code,
          name: stored.name,
          unit: stored.unit,
          quantity: selection.quantity));
      session.stock[stored.id] = StockPart(
          id: stored.id,
          code: stored.code,
          name: stored.name,
          unit: stored.unit,
          stock: stored.stock - selection.quantity);
    }
    final updated = current.copyWith(
        status: WorkOrderStatus.completed,
        completedAt: DateTime.now(),
        completionNotes: draft.notes.trim(),
        actualHours: draft.actualHours,
        parts: List.unmodifiable(used));
    session.orders[order.id] = updated;
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
          actualHours: i == 4 ? 0.75 : 0);
      orders[order.id] = order;
    }
  }
  final orders = <String, WorkOrder>{};
  final stock = <String, StockPart>{};
}
