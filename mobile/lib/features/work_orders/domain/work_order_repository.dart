import 'work_order.dart';

abstract interface class WorkOrderRepository {
  bool get isDemo;
  Future<ResultPage<WorkOrder>> assigned(String technicianId,
      {WorkOrderPriority? priority, int page = 1});
  Future<WorkOrder> detail(String id, String technicianId);
  Future<WorkOrder> start(WorkOrder order, String technicianId);
  Future<WorkOrder> complete(
      WorkOrder order, CompletionDraft draft, String technicianId);
  Future<ResultPage<StockPart>> parts(String technicianId,
      {String search = '', int page = 1});
}
