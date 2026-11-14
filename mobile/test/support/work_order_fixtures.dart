import 'package:smart_cmms_mobile/features/work_orders/data/demo_work_order_repository.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order_repository.dart';

import 'auth_fixtures.dart';

const workId = 'a1111111-2222-4333-8444-555555555555';
const stockId = 'b1111111-2222-4333-8444-555555555555';
const fixturePart = StockPart(
    id: stockId, code: 'PART-001', name: 'Vòng bi', unit: 'Cái', stock: 12);
Map<String, Object?> orderJson({String status = 'ASSIGNED', String? owner}) => {
      'id': workId,
      'workOrderCode': 'WO-TEST-001',
      'title': 'Kiểm tra bơm',
      'assetId': 'c1111111-2222-4333-8444-555555555555',
      'asset': {'assetCode': 'AST-001', 'name': 'Máy bơm'},
      'assignedTechnicianId': owner ?? technician.id,
      'status': status,
      'priority': 'CRITICAL',
      'description': 'Kiểm tra áp suất',
      'scheduledEndDate': '2026-12-01',
      'startTime': status == 'ASSIGNED' ? null : '2026-11-13T01:00:00Z',
      'completedTime': status == 'COMPLETED' ? '2026-11-13T02:00:00Z' : null,
      'actualRepairTimeHours': status == 'COMPLETED' ? '0.50' : '0.00',
      'completionNotes':
          status == 'COMPLETED' ? 'Đã kiểm tra và thay vòng bi.' : null,
      'parts': status == 'COMPLETED'
          ? [
              {
                'partId': stockId,
                'quantityUsed': 2,
                'part': {
                  'partCode': 'PART-001',
                  'name': 'Vòng bi',
                  'unit': 'Cái'
                }
              }
            ]
          : [],
    };
Map<String, Object?> pageJson(List<Object?> items,
        {int page = 1, int? total, int totalPages = 1}) =>
    {
      'success': true,
      'data': items,
      'meta': {
        'page': page,
        'limit': 20,
        'total': total ?? items.length,
        'totalPages': totalPages
      },
    };

class FakeWorkOrderRepository implements WorkOrderRepository {
  final delegate = DemoWorkOrderRepository();
  @override
  bool get isDemo => true;
  int starts = 0, completions = 0;
  CompletionDraft? lastDraft;
  Future<ResultPage<WorkOrder>> Function(
      String user, WorkOrderPriority? priority, int page)? listHook;
  Future<WorkOrder> Function(WorkOrder order, String user)? startHook;
  Future<WorkOrder> Function(
      WorkOrder order, CompletionDraft draft, String user)? completeHook;
  Object? detailError, partsError;
  @override
  Future<ResultPage<WorkOrder>> assigned(String technicianId,
          {WorkOrderPriority? priority, int page = 1}) =>
      listHook?.call(technicianId, priority, page) ??
      delegate.assigned(technicianId, priority: priority, page: page);
  @override
  Future<WorkOrder> detail(String id, String technicianId) async {
    if (detailError != null) throw detailError!;
    return delegate.detail(id, technicianId);
  }

  @override
  Future<WorkOrder> start(WorkOrder order, String technicianId) {
    starts++;
    return startHook?.call(order, technicianId) ??
        delegate.start(order, technicianId);
  }

  @override
  Future<WorkOrder> complete(
      WorkOrder order, CompletionDraft draft, String technicianId) {
    completions++;
    lastDraft = draft;
    return completeHook?.call(order, draft, technicianId) ??
        delegate.complete(order, draft, technicianId);
  }

  @override
  Future<ResultPage<StockPart>> parts(String technicianId,
      {String search = '', int page = 1}) async {
    if (partsError != null) throw partsError!;
    return delegate.parts(technicianId, search: search, page: page);
  }
}
