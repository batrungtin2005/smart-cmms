import 'package:smart_cmms_mobile/features/assets/domain/asset_details.dart';
import 'package:smart_cmms_mobile/features/assets/domain/asset_identifier.dart';
import 'package:smart_cmms_mobile/features/assets/domain/asset_repository.dart';

const assetId = '11111111-2222-4333-8444-555555555555';
const qrPayload =
    '{"app":"SMART_CMMS","assetCode":"AST-001","assetId":"$assetId","name":"Tên trên tem","v":"1.0"}';
final demoAsset = AssetDetails(
  id: assetId,
  code: 'AST-001',
  name: 'Máy bơm thử nghiệm',
  category: 'Thủy lực',
  status: 'OPERATIONAL',
  criticality: 'HIGH',
  operatingHours: 1250.5,
  manufacturer: 'Zentech',
  model: 'PUMP-01',
  location: 'Dây chuyền 1',
  factoryArea: 'Xưởng thử nghiệm',
  specifications: const {'Công suất': '7,5 kW'},
  recentHistory: [
    MaintenanceEntry(
        title: 'Kiểm tra bơm',
        eventType: 'INSPECTION',
        createdAt: DateTime.utc(2026, 1, 20),
        performedBy: 'Kỹ thuật viên thử nghiệm')
  ],
);

Map<String, Object?> inspectionJson() => {
      'success': true,
      'asset': {
        'id': assetId,
        'assetCode': 'AST-001',
        'name': demoAsset.name,
        'category': 'Thủy lực',
        'status': 'OPERATIONAL',
        'criticality': 'HIGH',
        'operatingHours': '1250.50',
        'manufacturer': 'Zentech',
        'model': 'PUMP-01',
        'serialNumber': null,
        'installDate': '2026-01-01',
        'location': {'name': 'Dây chuyền 1', 'factoryArea': 'Xưởng thử nghiệm'},
        'specifications': {'Công suất': '7,5 kW'},
      },
      'recentMaintenanceHistory': [
        {
          'title': 'Kiểm tra bơm',
          'eventType': 'INSPECTION',
          'createdAt': '2026-01-20T10:00:00.000Z',
          'actionTaken': 'Vệ sinh lọc',
          'performedBy': {
            'fullName': 'Kỹ thuật viên thử nghiệm',
            'passwordHash': 'must-not-be-used'
          },
        }
      ],
    };

class FakeAssetRepository implements AssetRepository {
  int calls = 0;
  AssetIdentifier? lastIdentifier;
  Object? error;
  Future<AssetDetails>? pending;

  @override
  Future<AssetDetails> lookup(AssetIdentifier identifier) async {
    calls++;
    lastIdentifier = identifier;
    if (error != null) throw error!;
    if (pending != null) return await pending!;
    return demoAsset;
  }
}
