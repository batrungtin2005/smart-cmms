enum WorkOrderPriority { critical, high, medium, low }

enum WorkOrderStatus {
  open,
  assigned,
  inProgress,
  completed,
  closed,
  cancelled,
  onHold
}

class WorkOrder {
  const WorkOrder(
      {required this.id,
      required this.code,
      required this.title,
      required this.assetId,
      required this.assetCode,
      required this.assetName,
      required this.technicianId,
      required this.priority,
      required this.status,
      this.description,
      this.scheduledEnd,
      this.startedAt,
      this.completedAt,
      this.completionNotes,
      this.actualHours = 0,
      this.parts = const []});
  final String id, code, title, assetId, assetCode, assetName, technicianId;
  final WorkOrderPriority priority;
  final WorkOrderStatus status;
  final String? description, completionNotes;
  final DateTime? scheduledEnd, startedAt, completedAt;
  final double actualHours;
  final List<UsedPart> parts;
  bool canStart(String userId) =>
      technicianId == userId && status == WorkOrderStatus.assigned;
  bool canComplete(String userId) =>
      technicianId == userId && status == WorkOrderStatus.inProgress;

  WorkOrder copyWith(
          {WorkOrderStatus? status,
          DateTime? startedAt,
          DateTime? completedAt,
          String? completionNotes,
          double? actualHours,
          List<UsedPart>? parts}) =>
      WorkOrder(
        id: id,
        code: code,
        title: title,
        assetId: assetId,
        assetCode: assetCode,
        assetName: assetName,
        technicianId: technicianId,
        priority: priority,
        status: status ?? this.status,
        description: description,
        scheduledEnd: scheduledEnd,
        startedAt: startedAt ?? this.startedAt,
        completedAt: completedAt ?? this.completedAt,
        completionNotes: completionNotes ?? this.completionNotes,
        actualHours: actualHours ?? this.actualHours,
        parts: parts ?? this.parts,
      );
}

class StockPart {
  const StockPart(
      {required this.id,
      required this.code,
      required this.name,
      required this.unit,
      required this.stock});
  final String id, code, name, unit;
  final int stock;
}

class UsedPart {
  const UsedPart(
      {required this.partId,
      required this.code,
      required this.name,
      required this.unit,
      required this.quantity});
  final String partId, code, name, unit;
  final int quantity;
}

class PartSelection {
  const PartSelection(this.part, this.quantity);
  final StockPart part;
  final int quantity;
}

class CompletionDraft {
  const CompletionDraft(
      {required this.notes, required this.actualHours, required this.parts});
  final String notes;
  final double actualHours;
  final List<PartSelection> parts;

  void validate() {
    if (notes.trim().isEmpty || notes.trim().length > 5000) {
      throw const WorkOrderValidation(
          'Nhập ghi chú xử lý từ 1 đến 5000 ký tự.');
    }
    if (!actualHours.isFinite || actualHours <= 0 || actualHours > 999999.99) {
      throw const WorkOrderValidation(
          'Thời gian thực hiện phải lớn hơn 0 và không vượt quá 999999,99 giờ.');
    }
    final ids = <String>{};
    for (final usage in parts) {
      if (!ids.add(usage.part.id) ||
          usage.quantity <= 0 ||
          usage.quantity > usage.part.stock) {
        throw const WorkOrderValidation(
            'Số lượng phụ tùng phải là số nguyên dương, không trùng và không vượt tồn kho.');
      }
    }
  }
}

class WorkOrderValidation implements Exception {
  const WorkOrderValidation(this.message);
  final String message;
}

class ResultPage<T> {
  const ResultPage(
      {required this.items,
      required this.page,
      required this.totalPages,
      required this.total});
  final List<T> items;
  final int page, totalPages, total;
  bool get hasMore => page < totalPages;
}
