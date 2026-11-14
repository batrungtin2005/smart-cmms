import 'dart:convert';

import 'package:flutter/material.dart';

import '../domain/asset_details.dart';

class AssetDetailsView extends StatelessWidget {
  const AssetDetailsView(
      {super.key, required this.asset, required this.onScanAgain});

  final AssetDetails asset;
  final VoidCallback onScanAgain;

  static const _statuses = {
    'OPERATIONAL': 'Đang hoạt động',
    'DOWN': 'Dừng máy do sự cố',
    'MAINTENANCE': 'Đang bảo trì',
    'DECOMMISSIONED': 'Ngừng sử dụng',
  };
  static const _criticalities = {
    'CRITICAL': 'Rất quan trọng',
    'HIGH': 'Cao',
    'MEDIUM': 'Trung bình',
    'LOW': 'Thấp',
  };
  static const _events = {
    'BREAKDOWN': 'Sự cố',
    'CORRECTIVE_REPAIR': 'Sửa chữa',
    'PREVENTIVE_MAINTENANCE': 'Bảo trì định kỳ',
    'INSPECTION': 'Kiểm tra',
    'PART_REPLACEMENT': 'Thay phụ tùng',
    'CALIBRATION': 'Hiệu chuẩn',
  };

  String _date(DateTime value) {
    final local = value.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
  }

  Widget _row(String label, String? value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              flex: 2,
              child:
                  Text(label, style: const TextStyle(color: Colors.black54))),
          const SizedBox(width: 12),
          Expanded(flex: 3, child: Text(value ?? 'Chưa cập nhật')),
        ]),
      );

  Widget _section(String title, List<Widget> children) => Card(
        child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ...children
              ],
            )),
      );

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SelectableText(asset.code,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(asset.name, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          _section('Thông tin thiết bị', [
            _row('Trạng thái', _statuses[asset.status] ?? 'Chưa xác định'),
            _row('Độ quan trọng',
                _criticalities[asset.criticality] ?? 'Chưa xác định'),
            _row('Nhóm thiết bị', asset.category),
            _row('Hãng sản xuất', asset.manufacturer),
            _row('Model', asset.model),
            _row('Số serial', asset.serialNumber),
            _row('Vị trí', asset.location),
            _row('Khu vực / xưởng', asset.factoryArea),
            _row('Ngày lắp đặt',
                asset.installDate == null ? null : _date(asset.installDate!)),
            _row('Giờ vận hành',
                '${asset.operatingHours.toStringAsFixed(2).replaceFirst('.', ',')} giờ'),
          ]),
          _section(
              'Thông số kỹ thuật',
              asset.specifications.isEmpty
                  ? [const Text('Chưa có thông số kỹ thuật.')]
                  : asset.specifications.entries
                      .map((entry) => _row(
                          entry.key,
                          entry.value is Map || entry.value is List
                              ? jsonEncode(entry.value)
                              : entry.value?.toString()))
                      .toList()),
          _section(
              'Lịch sử bảo trì gần nhất',
              asset.recentHistory.isEmpty
                  ? [const Text('Chưa có lịch sử bảo trì.')]
                  : asset.recentHistory
                      .map((entry) => Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(entry.title,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600)),
                                  Text(
                                      '${_events[entry.eventType] ?? 'Bảo trì'} · ${_date(entry.createdAt)}'),
                                  if (entry.actionTaken != null)
                                    Text(entry.actionTaken!),
                                  if (entry.performedBy != null)
                                    Text('Thực hiện: ${entry.performedBy}'),
                                ]),
                          ))
                      .toList()),
          const SizedBox(height: 12),
          FilledButton.icon(
              onPressed: onScanAgain,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Tra cứu thiết bị khác')),
          const SizedBox(height: 16),
        ],
      );
}
