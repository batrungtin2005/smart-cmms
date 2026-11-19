class LocalOperation {
  const LocalOperation({
    required this.uuid,
    required this.type,
    required this.targetId,
    required this.payload,
    required this.createdAt,
    this.status = 'PENDING',
    this.error,
  });
  final String uuid, type, targetId, status;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final String? error;
}
