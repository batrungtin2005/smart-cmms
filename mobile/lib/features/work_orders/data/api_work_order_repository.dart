import '../../../core/network/api_client.dart';
import '../../auth/data/token_store.dart';
import '../domain/work_order.dart';
import '../domain/work_order_repository.dart';

// Proposed contract is documented in mobile/docs/work_order_api_contract.md.
// SV03 must confirm and implement it before live integration is accepted.
class ApiWorkOrderRepository implements WorkOrderRepository {
  const ApiWorkOrderRepository({required this.api, required this.tokens});
  final ApiClient api;
  final TokenStore tokens;
  @override
  bool get isDemo => false;

  static String priorityCode(WorkOrderPriority value) => switch (value) {
        WorkOrderPriority.critical => 'CRITICAL',
        WorkOrderPriority.high => 'HIGH',
        WorkOrderPriority.medium => 'MEDIUM',
        WorkOrderPriority.low => 'LOW',
      };
  Future<String> _token() async {
    final token = await tokens.read();
    if (token == null || token.isEmpty) {
      throw const ApiException('Phiên đăng nhập đã hết hạn.', statusCode: 401);
    }
    return token;
  }

  @override
  Future<ResultPage<WorkOrder>> assigned(String technicianId,
      {WorkOrderPriority? priority, int page = 1}) async {
    Object? data;
    try {
      data =
          await api.get('work-orders/my-tasks', token: await _token(), query: {
        'page': '$page',
        'limit': '20',
        if (priority != null) 'priority': priorityCode(priority),
      });
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        throw const ApiException(
            'Máy chủ chưa hỗ trợ danh sách công việc. Vui lòng thử lại sau.',
            statusCode: 404);
      }
      rethrow;
    }
    return _page(
        data, page, (json) => _order(json, technicianId, summary: true));
  }

  @override
  Future<WorkOrder> detail(String id, String technicianId) async {
    final order = _order(
        _map(await api.get('work-orders/${Uri.encodeComponent(id)}',
            token: await _token())),
        technicianId);
    if (order.id != id) _invalid();
    return order;
  }

  void _owner(WorkOrder order, String technicianId) {
    if (order.technicianId != technicianId) {
      throw const ApiException('Bạn không được giao công việc này.',
          statusCode: 403);
    }
  }

  @override
  Future<WorkOrder> start(WorkOrder order, String technicianId) async {
    _owner(order, technicianId);
    if (!order.canStart(technicianId)) {
      throw const WorkOrderValidation(
          'Chỉ có thể bắt đầu công việc đang được giao.');
    }
    final updated = _order(
        _map(await api.patch(
            'work-orders/${Uri.encodeComponent(order.id)}/status',
            {'status': 'IN_PROGRESS', 'expectedStatus': 'ASSIGNED'},
            token: await _token())),
        technicianId);
    if (updated.id != order.id ||
        updated.status != WorkOrderStatus.inProgress) {
      _invalid();
    }
    return updated;
  }

  @override
  Future<WorkOrder> complete(
      WorkOrder order, CompletionDraft draft, String technicianId) async {
    _owner(order, technicianId);
    if (!order.canComplete(technicianId)) {
      throw const WorkOrderValidation(
          'Công việc phải đang thực hiện mới được hoàn thành.');
    }
    draft.validate();
    final updated = _order(
        _map(await api.patch(
            'work-orders/${Uri.encodeComponent(order.id)}/status',
            {
              'status': 'COMPLETED',
              'expectedStatus': 'IN_PROGRESS',
              'completionNotes': draft.notes.trim(),
              'actualRepairTimeHours': draft.actualHours,
              'parts': draft.parts
                  .map((usage) =>
                      {'partId': usage.part.id, 'quantityUsed': usage.quantity})
                  .toList(),
            },
            token: await _token())),
        technicianId);
    if (updated.id != order.id || updated.status != WorkOrderStatus.completed) {
      _invalid();
    }
    return updated;
  }

  @override
  Future<ResultPage<StockPart>> parts(String technicianId,
      {String search = '', int page = 1}) async {
    return _page(
        await api.get('parts', token: await _token(), query: {
          'page': '$page',
          'limit': '20',
          if (search.trim().isNotEmpty) 'search': search.trim(),
        }),
        page,
        (json) => StockPart(
            id: _string(json, 'id'),
            code: _string(json, 'partCode'),
            name: _string(json, 'name'),
            unit: _string(json, 'unit'),
            stock: _int(json['currentStock'])));
  }

  WorkOrder _order(Map<String, dynamic> json, String technicianId,
      {bool summary = false}) {
    final owner = _string(json, 'assignedTechnicianId');
    if (owner != technicianId) {
      throw const ApiException('Bạn không được giao công việc này.',
          statusCode: 403);
    }
    final asset = _map(json['asset']);
    final priority = switch (json['priority']) {
      'CRITICAL' => WorkOrderPriority.critical,
      'HIGH' => WorkOrderPriority.high,
      'MEDIUM' => WorkOrderPriority.medium,
      'LOW' => WorkOrderPriority.low,
      _ => _invalid(),
    };
    final status = switch (json['status']) {
      'OPEN' => WorkOrderStatus.open,
      'ASSIGNED' => WorkOrderStatus.assigned,
      'IN_PROGRESS' => WorkOrderStatus.inProgress,
      'COMPLETED' => WorkOrderStatus.completed,
      'CLOSED' => WorkOrderStatus.closed,
      'CANCELLED' => WorkOrderStatus.cancelled,
      'ON_HOLD' => WorkOrderStatus.onHold,
      _ => _invalid(),
    };
    final rawParts = summary ? json['parts'] ?? const [] : json['parts'];
    if (rawParts is! List) _invalid();
    final hours = double.tryParse(
        '${json['actualRepairTimeHours'] ?? (summary ? 0 : null)}');
    if (hours == null || !hours.isFinite || hours < 0) _invalid();
    return WorkOrder(
      id: _string(json, 'id'),
      code: _string(json, 'workOrderCode'),
      title: _string(json, 'title'),
      assetId: _string(json, 'assetId'),
      assetCode: _string(asset, 'assetCode'),
      assetName: _string(asset, 'name'),
      technicianId: owner,
      priority: priority,
      status: status,
      description: _optionalString(json['description']),
      scheduledEnd: _date(json['scheduledEndDate']),
      startedAt: _date(json['startTime']),
      completedAt: _date(json['completedTime']),
      completionNotes: _optionalString(json['completionNotes']),
      actualHours: hours,
      parts: List.unmodifiable(rawParts.map((raw) {
        final usage = _map(raw), part = _map(_map(raw)['part']);
        final quantity = _int(usage['quantityUsed']);
        if (quantity <= 0) _invalid();
        return UsedPart(
            partId: _string(usage, 'partId'),
            code: _string(part, 'partCode'),
            name: _string(part, 'name'),
            unit: _string(part, 'unit'),
            quantity: quantity);
      })),
    );
  }

  ResultPage<T> _page<T>(
      Object? raw, int requestedPage, T Function(Map<String, dynamic>) parse) {
    final data = _map(raw), meta = _map(_map(raw)['meta']);
    if (data['success'] != true || data['data'] is! List) _invalid();
    final page = _int(meta['page']),
        totalPages = _int(meta['totalPages']),
        total = _int(meta['total']);
    if (page != requestedPage ||
        page < 1 ||
        (data['data'] as List).length > 20) {
      _invalid();
    }
    return ResultPage(
        items: List.unmodifiable(
            (data['data'] as List).map((item) => parse(_map(item)))),
        page: page,
        totalPages: totalPages,
        total: total);
  }

  Map<String, dynamic> _map(Object? value) {
    if (value is! Map<String, dynamic>) _invalid();
    return value;
  }

  String _string(Map<String, dynamic> json, String key) {
    final value = json[key];
    if (value is! String || value.trim().isEmpty) _invalid();
    return value;
  }

  String? _optionalString(Object? value) {
    if (value == null) return null;
    if (value is! String) _invalid();
    return value;
  }

  int _int(Object? value) {
    if (value is! int || value < 0) _invalid();
    return value;
  }

  DateTime? _date(Object? value) {
    if (value == null) return null;
    if (value is! String) _invalid();
    final date = DateTime.tryParse(value);
    if (date == null) _invalid();
    return date;
  }

  Never _invalid() =>
      throw const ApiException('Máy chủ trả về dữ liệu công việc chưa hợp lệ.');
}
