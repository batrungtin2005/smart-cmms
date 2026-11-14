import '../../../core/network/api_client.dart';
import '../../auth/data/token_store.dart';
import '../domain/asset_details.dart';
import '../domain/asset_identifier.dart';
import '../domain/asset_repository.dart';

class AssetRepositoryImpl implements AssetRepository {
  const AssetRepositoryImpl({required this.api, required this.tokens});

  final ApiClient api;
  final TokenStore tokens;

  @override
  Future<AssetDetails> lookup(AssetIdentifier identifier) async {
    final token = await tokens.read();
    if (token == null || token.isEmpty) {
      throw const ApiException(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          statusCode: 401);
    }
    Object? data;
    try {
      data = await api.get(
          'assets/inspect/${Uri.encodeComponent(identifier.code)}',
          token: token);
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        throw ApiException(
            'Không tìm thấy tài sản ${identifier.code}. Hãy kiểm tra lại mã.',
            statusCode: 404);
      }
      rethrow;
    }
    if (data is! Map<String, dynamic> || data['success'] != true) _invalid();
    final asset = data['asset'];
    final history = data['recentMaintenanceHistory'];
    if (asset is! Map<String, dynamic> || history is! List) _invalid();
    final id = _requiredString(asset, 'id');
    final code = _requiredString(asset, 'assetCode');
    if (code != identifier.code ||
        (identifier.expectedId != null &&
            id.toLowerCase() != identifier.expectedId)) {
      throw const ApiException(
          'Mã QR không khớp tài sản trên máy chủ. Hãy kiểm tra tem hoặc nhập mã thủ công.');
    }
    final hours = double.tryParse('${asset['operatingHours']}');
    if (hours == null || !hours.isFinite || hours < 0) _invalid();
    final specs = asset['specifications'];
    if (specs != null && specs is! Map<String, dynamic>) _invalid();
    final location = asset['location'];
    if (location != null && location is! Map<String, dynamic>) _invalid();
    return AssetDetails(
      id: id,
      code: code,
      name: _requiredString(asset, 'name'),
      category: _requiredString(asset, 'category'),
      status: _requiredString(asset, 'status'),
      criticality: _requiredString(asset, 'criticality'),
      operatingHours: hours,
      manufacturer: _optionalString(asset['manufacturer']),
      model: _optionalString(asset['model']),
      serialNumber: _optionalString(asset['serialNumber']),
      location: location == null ? null : _optionalString(location['name']),
      factoryArea:
          location == null ? null : _optionalString(location['factoryArea']),
      installDate: _date(asset['installDate']),
      specifications:
          Map<String, Object?>.unmodifiable(specs ?? <String, Object?>{}),
      recentHistory: List.unmodifiable(history.take(5).map(_history)),
    );
  }

  MaintenanceEntry _history(Object? value) {
    if (value is! Map<String, dynamic>) _invalid();
    final performedBy = value['performedBy'];
    if (performedBy != null && performedBy is! Map<String, dynamic>) _invalid();
    final createdAt = _date(value['createdAt']);
    if (createdAt == null) _invalid();
    return MaintenanceEntry(
      title: _requiredString(value, 'title'),
      eventType: _requiredString(value, 'eventType'),
      createdAt: createdAt,
      actionTaken: _optionalString(value['actionTaken']),
      performedBy:
          performedBy == null ? null : _optionalString(performedBy['fullName']),
    );
  }

  String _requiredString(Map<String, dynamic> value, String key) {
    final field = value[key];
    if (field is! String || field.trim().isEmpty) _invalid();
    return field;
  }

  String? _optionalString(Object? value) {
    if (value == null) return null;
    if (value is! String) _invalid();
    return value.trim().isEmpty ? null : value;
  }

  DateTime? _date(Object? value) {
    if (value == null) return null;
    if (value is! String) _invalid();
    final date = DateTime.tryParse(value);
    if (date == null) _invalid();
    return date;
  }

  Never _invalid() =>
      throw const ApiException('Thông tin tài sản từ máy chủ không hợp lệ.');
}
