import 'package:flutter/material.dart';

import '../../../core/local/local_operation.dart';
import '../domain/local_work_orders.dart';

class SyncQueuePage extends StatefulWidget {
  const SyncQueuePage(
      {super.key,
      required this.local,
      required this.userId,
      required this.onClose});
  final LocalWorkOrders local;
  final String userId;
  final VoidCallback onClose;
  @override
  State<SyncQueuePage> createState() => _SyncQueuePageState();
}

class _SyncQueuePageState extends State<SyncQueuePage> {
  late Future<List<LocalOperation>> _items;
  @override
  void initState() {
    super.initState();
    _items = widget.local.queuedOperations(widget.userId);
  }

  static const _types = {
    'START_WORK_ORDER': 'Bắt đầu công việc',
    'RESUME_WORK_ORDER': 'Tiếp tục công việc',
    'PAUSE_WORK_ORDER': 'Tạm dừng công việc',
    'COMPLETE_WORK_ORDER': 'Ghi hoàn thành',
    'REQUEST_MATERIALS': 'Yêu cầu vật tư',
    'CANCEL_MATERIAL_REQUEST': 'Hủy yêu cầu vật tư',
  };
  static const _statuses = {
    'PENDING': 'Chờ đồng bộ',
    'SYNCED': 'Đã đồng bộ',
    'CONFLICT': 'Xung đột, cần kiểm tra',
    'FAILED': 'Chưa gửi được'
  };
  @override
  Widget build(BuildContext context) => PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) widget.onClose();
      },
      child: Scaffold(
          appBar: AppBar(
              title: const Text('Trạng thái đồng bộ'),
              leading: IconButton(
                  onPressed: widget.onClose,
                  tooltip: 'Quay lại',
                  icon: const Icon(Icons.arrow_back)),
              actions: [
                IconButton(
                    tooltip: 'Cập nhật hàng đợi',
                    icon: const Icon(Icons.refresh),
                    onPressed: () => setState(() =>
                        _items = widget.local.queuedOperations(widget.userId)))
              ]),
          body: FutureBuilder<List<LocalOperation>>(
              future: _items,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return const Center(
                      child: Text(
                          'Không đọc được hàng đợi trên máy. Hãy thử tải lại.'));
                }
                final items = snapshot.data ?? [];
                return ListView(padding: const EdgeInsets.all(16), children: [
                  const Card(
                      child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                              'Thao tác được lưu trên điện thoại, chưa gửi lên máy chủ. '
                              'Chức năng gửi đồng bộ đang chờ tích hợp.'))),
                  Text(
                      'Đang chờ: ${items.where((o) => o.status == 'PENDING').length}'),
                  if (items.isEmpty)
                    const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('Chưa có thao tác chờ đồng bộ.')),
                  for (final item in items)
                    Card(
                        child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_types[item.type] ?? item.type,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold)),
                                  Text(item.payload['workOrderCode']
                                          as String? ??
                                      item.targetId),
                                  Text(_statuses[item.status] ?? item.status),
                                  Text('Lưu lúc: ${item.createdAt.toLocal()}'),
                                  SelectableText('Mã thao tác: ${item.uuid}'),
                                  if (item.error != null) Text(item.error!),
                                ]))),
                ]);
              })));
}
