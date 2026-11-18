import 'package:flutter/material.dart';

import '../../auth/presentation/auth_controller.dart';
import '../../assets/domain/asset_repository.dart';
import '../../assets/presentation/asset_lookup_page.dart';
import '../../assets/presentation/qr_camera_view.dart';
import '../../work_orders/domain/work_order_repository.dart';
import '../../work_orders/presentation/work_orders_page.dart';
import '../../work_orders/domain/local_work_orders.dart';
import '../../work_orders/presentation/sync_queue_page.dart';

class TechnicianHomePage extends StatefulWidget {
  const TechnicianHomePage(
      {super.key,
      required this.controller,
      required this.assetRepository,
      required this.workOrderRepository,
      this.cameraBuilder});

  final AuthController controller;
  final AssetRepository assetRepository;
  final WorkOrderRepository workOrderRepository;
  final QrCameraBuilder? cameraBuilder;

  @override
  State<TechnicianHomePage> createState() => _TechnicianHomePageState();
}

class _TechnicianHomePageState extends State<TechnicianHomePage> {
  bool _showScanner = false;
  bool _showWorkOrders = false;
  bool _showSync = false;

  @override
  Widget build(BuildContext context) {
    final local = widget.workOrderRepository is LocalWorkOrders
        ? widget.workOrderRepository as LocalWorkOrders
        : null;
    if (_showSync && local != null) {
      return SyncQueuePage(
          local: local,
          userId: widget.controller.user!.id,
          onClose: () => setState(() => _showSync = false));
    }
    if (_showWorkOrders) {
      return WorkOrdersPage(
          repository: widget.workOrderRepository,
          technicianId: widget.controller.user!.id,
          onClose: () => setState(() => _showWorkOrders = false),
          onSessionExpired: widget.controller.signOut);
    }
    if (_showScanner) {
      return AssetLookupPage(
          repository: widget.assetRepository,
          cameraBuilder: widget.cameraBuilder,
          onClose: () => setState(() => _showScanner = false),
          onSessionExpired: widget.controller.signOut);
    }
    final controller = widget.controller;
    final user = controller.user!;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart CMMS'),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: controller.busy ? null : controller.signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text('Xin chào, ${user.fullName}',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          const Text('Kỹ thuật viên hiện trường'),
          if (controller.offlineSession)
            const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text(
                    'Đang dùng phiên offline còn hạn. Chỉ truy cập dữ liệu đã lưu trên máy.')),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Thông tin tài khoản',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(user.username),
                  Text(user.email),
                ],
              ),
            ),
          ),
          if (controller.errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(controller.errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          const SizedBox(height: 16),
          Card(
            child: Column(children: [
              ListTile(
                  onTap: controller.busy
                      ? null
                      : () => setState(() => _showScanner = true),
                  leading: const Icon(Icons.qr_code_scanner),
                  title: const Text('Quét mã QR thiết bị'),
                  trailing: const Icon(Icons.chevron_right)),
              const Divider(height: 1),
              ListTile(
                  onTap: controller.busy
                      ? null
                      : () => setState(() => _showWorkOrders = true),
                  leading: const Icon(Icons.assignment_outlined),
                  title: const Text('Công việc được giao'),
                  subtitle: widget.workOrderRepository.isDemo
                      ? const Text('Dữ liệu mẫu')
                      : null,
                  trailing: const Icon(Icons.chevron_right)),
              const Divider(height: 1),
              ListTile(
                  enabled: local != null,
                  onTap: local == null
                      ? null
                      : () => setState(() => _showSync = true),
                  leading: const Icon(Icons.sync),
                  title: const Text('Trạng thái đồng bộ'),
                  trailing: local == null
                      ? const Text('Sắp có')
                      : const Icon(Icons.chevron_right)),
            ]),
          ),
        ],
      ),
    );
  }
}
