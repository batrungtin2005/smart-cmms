import 'work_order.dart';

abstract interface class WorkOrderRepository {
  bool get isDemo;
  Future<ResultPage<WorkOrder>> assigned(String technicianId,
      {WorkOrderPriority? priority, int page = 1});
  Future<WorkOrder> detail(String id, String technicianId);
  Future<WorkOrder> start(WorkOrder order, String technicianId);
  Future<WorkOrder> pause(WorkOrder order, String reason, String technicianId);
  Future<WorkOrder> complete(
      WorkOrder order, CompletionDraft draft, String technicianId);
  Future<ResultPage<StockPart>> parts(String technicianId,
      {String search = '', int page = 1});
  Future<ResultPage<MaterialRequest>> materials(
      String workOrderId, String technicianId,
      {MaterialStatus? status, int page = 1});
  Future<MaterialRequest> requestMaterials(
      WorkOrder order, MaterialDraft draft, String technicianId);
  Future<MaterialRequest> cancelMaterial(
      MaterialRequest request, String reason, String technicianId);
  Future<MaterialRequest> materialDetail(
      MaterialRequest request, String technicianId);
}
