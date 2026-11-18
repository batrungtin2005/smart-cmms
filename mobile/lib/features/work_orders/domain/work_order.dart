enum WorkOrderPriority { critical, high, medium, low }

enum WorkOrderStatus {
  open,
  assigned,
  inProgress,
  completed,
  closed,
  cancelled,
  onHold,
  reworkRequired
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
      this.rootCause,
      this.solution,
      this.verificationNotes,
      this.actualHours = 0,
      this.parts = const [],
      this.cachedAt,
      this.pendingSync = false});
  final String id, code, title, assetId, assetCode, assetName, technicianId;
  final WorkOrderPriority priority;
  final WorkOrderStatus status;
  final String? description,
      completionNotes,
      rootCause,
      solution,
      verificationNotes;
  final DateTime? scheduledEnd, startedAt, completedAt;
  final double actualHours;
  final List<UsedPart> parts;
  final DateTime? cachedAt;
  final bool pendingSync;
  bool canStart(String userId) =>
      technicianId == userId &&
      [
        WorkOrderStatus.assigned,
        WorkOrderStatus.onHold,
        WorkOrderStatus.reworkRequired
      ].contains(status);
  bool canComplete(String userId) =>
      technicianId == userId && status == WorkOrderStatus.inProgress;
  bool canRequestMaterials(String userId) =>
      technicianId == userId &&
      [WorkOrderStatus.inProgress, WorkOrderStatus.onHold].contains(status);

  WorkOrder copyWith(
          {WorkOrderStatus? status,
          DateTime? startedAt,
          DateTime? completedAt,
          String? completionNotes,
          String? rootCause,
          String? solution,
          double? actualHours,
          List<UsedPart>? parts,
          bool? pendingSync,
          DateTime? cachedAt}) =>
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
        rootCause: rootCause ?? this.rootCause,
        solution: solution ?? this.solution,
        verificationNotes: verificationNotes,
        actualHours: actualHours ?? this.actualHours,
        parts: parts ?? this.parts,
        pendingSync: pendingSync ?? this.pendingSync,
        cachedAt: cachedAt ?? this.cachedAt,
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
      {required this.rootCause, required this.solution, this.notes = ''});
  final String rootCause, solution, notes;

  void validate() {
    if (rootCause.trim().isEmpty || rootCause.trim().length > 255) {
      throw const WorkOrderValidation('Nhập nguyên nhân từ 1 đến 255 ký tự.');
    }
    if (solution.trim().isEmpty || solution.trim().length > 10000) {
      throw const WorkOrderValidation('Nhập cách xử lý từ 1 đến 10000 ký tự.');
    }
    if (notes.trim().length > 10000) {
      throw const WorkOrderValidation('Ghi chú không vượt quá 10000 ký tự.');
    }
  }
}

class MaterialDraft {
  const MaterialDraft({required this.parts, this.notes = ''});
  final List<PartSelection> parts;
  final String notes;
  void validate() {
    if (parts.isEmpty || parts.length > 50 || notes.trim().length > 1000) {
      throw const WorkOrderValidation(
          'Chọn 1–50 phụ tùng, ghi chú tối đa 1000 ký tự.');
    }
    final ids = <String>{};
    for (final usage in parts) {
      if (!ids.add(usage.part.id) ||
          usage.quantity <= 0 ||
          usage.quantity > 1000000) {
        throw const WorkOrderValidation(
            'Số lượng phải từ 1 đến 1000000, không trùng phụ tùng.');
      }
    }
  }
}

enum MaterialStatus { pending, approved, rejected, cancelled }

class MaterialRequest {
  const MaterialRequest(
      {required this.id,
      required this.workOrderId,
      required this.requestedById,
      required this.status,
      this.notes,
      this.reason,
      this.createdAt,
      this.items = const [],
      this.pendingSync = false});
  final String id, workOrderId, requestedById;
  final MaterialStatus status;
  final String? notes, reason;
  final DateTime? createdAt;
  final List<UsedPart> items;
  final bool pendingSync;
  MaterialRequest cancelled(String reason) => MaterialRequest(
      id: id,
      workOrderId: workOrderId,
      requestedById: requestedById,
      status: MaterialStatus.cancelled,
      notes: notes,
      reason: reason,
      createdAt: createdAt,
      items: items,
      pendingSync: pendingSync);
}

class SavedWorkDraft {
  const SavedWorkDraft(
      {required this.report,
      required this.material,
      this.reviewRequired = false});
  final CompletionDraft report;
  final MaterialDraft material;
  final bool reviewRequired;
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
      required this.total,
      this.cachedAt});
  final List<T> items;
  final int page, totalPages, total;
  final DateTime? cachedAt;
  bool get hasMore => page < totalPages;
}
