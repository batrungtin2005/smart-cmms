import '../domain/work_order.dart';

extension PriorityLabel on WorkOrderPriority {
  String get label => switch (this) {
        WorkOrderPriority.critical => 'Khẩn cấp',
        WorkOrderPriority.high => 'Cao',
        WorkOrderPriority.medium => 'Trung bình',
        WorkOrderPriority.low => 'Thấp',
      };
}

extension StatusLabel on WorkOrderStatus {
  String get label => switch (this) {
        WorkOrderStatus.open => 'Mới tạo',
        WorkOrderStatus.assigned => 'Được giao',
        WorkOrderStatus.inProgress => 'Đang thực hiện',
        WorkOrderStatus.completed => 'Đã hoàn thành',
        WorkOrderStatus.closed => 'Đã nghiệm thu',
        WorkOrderStatus.cancelled => 'Đã hủy',
        WorkOrderStatus.onHold => 'Tạm hoãn',
      };
}

String workDate(DateTime? value) {
  if (value == null) return 'Chưa cập nhật';
  final date = value.toLocal();
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}
