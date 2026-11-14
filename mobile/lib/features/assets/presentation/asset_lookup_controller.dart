import 'package:flutter/foundation.dart';

import '../../../core/network/api_client.dart';
import '../domain/asset_details.dart';
import '../domain/asset_identifier.dart';
import '../domain/asset_repository.dart';

class AssetLookupController extends ChangeNotifier {
  AssetLookupController(this._repository);

  final AssetRepository _repository;
  AssetDetails? asset;
  String? error;
  bool busy = false;
  bool sessionExpired = false;
  bool _disposed = false;

  Future<void> lookup(String raw) async {
    if (_disposed || busy || asset != null || error != null) return;
    busy = true;
    sessionExpired = false;
    notifyListeners();
    try {
      final identifier = AssetIdentifier.parse(raw);
      final result = await _repository.lookup(identifier);
      if (!_disposed) asset = result;
    } on InvalidAssetCode catch (failure) {
      if (!_disposed) error = failure.toString();
    } on ApiException catch (failure) {
      if (!_disposed) {
        error = failure.message;
        sessionExpired = failure.statusCode == 401;
      }
    } catch (_) {
      if (!_disposed) error = 'Không thể tra cứu tài sản. Vui lòng thử lại.';
    } finally {
      busy = false;
      if (!_disposed) notifyListeners();
    }
  }

  void reset() {
    if (_disposed || busy) return;
    asset = null;
    error = null;
    sessionExpired = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
