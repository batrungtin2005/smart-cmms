import '../../../core/local/local_store.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/connection_monitor.dart';
import '../domain/asset_details.dart';
import '../domain/asset_identifier.dart';
import '../domain/asset_repository.dart';

class OfflineAssetRepository implements AssetRepository {
  const OfflineAssetRepository(
      {required this.remote,
      required this.store,
      required this.connection,
      required this.currentUserId});
  final AssetRepository remote;
  final LocalStore store;
  final ConnectionMonitor connection;
  final Future<String> Function() currentUserId;
  @override
  Future<AssetDetails> lookup(AssetIdentifier identifier) async {
    final user = await currentUserId();
    if (!connection.offline) {
      try {
        final a = await remote.lookup(identifier);
        await store.put(user, 'asset', a.code, {
          'id': a.id,
          'code': a.code,
          'name': a.name,
          'category': a.category,
          'status': a.status,
          'criticality': a.criticality,
          'operatingHours': a.operatingHours,
          'manufacturer': a.manufacturer,
          'model': a.model,
          'serialNumber': a.serialNumber,
          'location': a.location,
          'factoryArea': a.factoryArea,
          'installDate': a.installDate?.toIso8601String(),
          'specifications': a.specifications,
          'recentHistory': a.recentHistory
              .map((h) => {
                    'title': h.title,
                    'eventType': h.eventType,
                    'createdAt': h.createdAt.toIso8601String(),
                    'actionTaken': h.actionTaken,
                    'performedBy': h.performedBy
                  })
              .toList(),
        });
        return a;
      } on ApiException catch (e) {
        if ([401, 403, 404].contains(e.statusCode)) {
          await store.remove(user, 'asset', identifier.code);
        }
        if (!e.isConnectionFailure) rethrow;
        connection.setOffline(true);
      }
    }
    final c = await store.read(user, 'asset', identifier.code);
    if (c == null) {
      throw const ApiException(
          'Thiết bị chưa được lưu trên máy. Kết nối mạng để tra cứu lần đầu.');
    }
    final a = c.data;
    if (identifier.expectedId != null &&
        (a['id'] as String).toLowerCase() != identifier.expectedId) {
      throw const ApiException('Mã QR không khớp thiết bị đã lưu trên máy.');
    }
    return AssetDetails(
        id: a['id'],
        code: a['code'],
        name: a['name'],
        category: a['category'],
        status: a['status'],
        criticality: a['criticality'],
        operatingHours: (a['operatingHours'] as num).toDouble(),
        manufacturer: a['manufacturer'],
        model: a['model'],
        serialNumber: a['serialNumber'],
        location: a['location'],
        factoryArea: a['factoryArea'],
        installDate:
            a['installDate'] == null ? null : DateTime.parse(a['installDate']),
        specifications: Map<String, Object?>.from(a['specifications']),
        recentHistory: (a['recentHistory'] as List)
            .map((h) => MaintenanceEntry(
                title: h['title'],
                eventType: h['eventType'],
                createdAt: DateTime.parse(h['createdAt']),
                actionTaken: h['actionTaken'],
                performedBy: h['performedBy']))
            .toList(),
        cachedAt: c.savedAt);
  }
}
