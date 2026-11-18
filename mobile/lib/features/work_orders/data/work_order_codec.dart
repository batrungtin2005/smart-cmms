import '../domain/work_order.dart';

Map<String, Object?> encodePart(StockPart p) => {
      'id': p.id,
      'code': p.code,
      'name': p.name,
      'unit': p.unit,
      'stock': p.stock
    };
StockPart decodePart(Map<String, dynamic> p) => StockPart(
    id: p['id'],
    code: p['code'],
    name: p['name'],
    unit: p['unit'],
    stock: p['stock']);
Map<String, Object?> _used(UsedPart p) => {
      'partId': p.partId,
      'code': p.code,
      'name': p.name,
      'unit': p.unit,
      'quantity': p.quantity
    };
UsedPart _decodeUsed(dynamic p) => UsedPart(
    partId: p['partId'],
    code: p['code'],
    name: p['name'],
    unit: p['unit'],
    quantity: p['quantity']);
Map<String, Object?> encodeOrder(WorkOrder w) => {
      'id': w.id,
      'code': w.code,
      'title': w.title,
      'assetId': w.assetId,
      'assetCode': w.assetCode,
      'assetName': w.assetName,
      'technicianId': w.technicianId,
      'priority': w.priority.name,
      'status': w.status.name,
      'description': w.description,
      'scheduledEnd': w.scheduledEnd?.toIso8601String(),
      'startedAt': w.startedAt?.toIso8601String(),
      'completedAt': w.completedAt?.toIso8601String(),
      'completionNotes': w.completionNotes,
      'rootCause': w.rootCause,
      'solution': w.solution,
      'verificationNotes': w.verificationNotes,
      'actualHours': w.actualHours,
      'parts': w.parts.map(_used).toList(),
      'pendingSync': w.pendingSync,
    };
DateTime? _date(dynamic value) => value == null ? null : DateTime.parse(value);
WorkOrder decodeOrder(Map<String, dynamic> w, {DateTime? cachedAt}) =>
    WorkOrder(
        id: w['id'],
        code: w['code'],
        title: w['title'],
        assetId: w['assetId'],
        assetCode: w['assetCode'],
        assetName: w['assetName'],
        technicianId: w['technicianId'],
        priority: WorkOrderPriority.values.byName(w['priority']),
        status: WorkOrderStatus.values.byName(w['status']),
        description: w['description'],
        scheduledEnd: _date(w['scheduledEnd']),
        startedAt: _date(w['startedAt']),
        completedAt: _date(w['completedAt']),
        completionNotes: w['completionNotes'],
        rootCause: w['rootCause'],
        solution: w['solution'],
        verificationNotes: w['verificationNotes'],
        actualHours: (w['actualHours'] as num).toDouble(),
        parts: (w['parts'] as List).map(_decodeUsed).toList(),
        pendingSync: w['pendingSync'] == true,
        cachedAt: cachedAt);
Map<String, Object?> encodeMaterial(MaterialRequest r) => {
      'id': r.id,
      'workOrderId': r.workOrderId,
      'requestedById': r.requestedById,
      'status': r.status.name,
      'notes': r.notes,
      'reason': r.reason,
      'createdAt': r.createdAt?.toIso8601String(),
      'items': r.items.map(_used).toList(),
      'pendingSync': r.pendingSync,
    };
MaterialRequest decodeMaterial(Map<String, dynamic> r) => MaterialRequest(
    id: r['id'],
    workOrderId: r['workOrderId'],
    requestedById: r['requestedById'],
    status: MaterialStatus.values.byName(r['status']),
    notes: r['notes'],
    reason: r['reason'],
    createdAt: _date(r['createdAt']),
    items: (r['items'] as List).map(_decodeUsed).toList(),
    pendingSync: r['pendingSync'] == true);

Map<String, Object?> encodeDraft(SavedWorkDraft d) => {
      'rootCause': d.report.rootCause,
      'solution': d.report.solution,
      'notes': d.report.notes,
      'materialNotes': d.material.notes,
      'parts': d.material.parts
          .map((p) => {'part': encodePart(p.part), 'quantity': p.quantity})
          .toList(),
      'reviewRequired': d.reviewRequired,
    };
SavedWorkDraft decodeDraft(Map<String, dynamic> d) => SavedWorkDraft(
    report: CompletionDraft(
        rootCause: d['rootCause'], solution: d['solution'], notes: d['notes']),
    material: MaterialDraft(
        notes: d['materialNotes'],
        parts: (d['parts'] as List)
            .map((p) => PartSelection(decodePart(p['part']), p['quantity']))
            .toList()),
    reviewRequired: d['reviewRequired'] == true);
