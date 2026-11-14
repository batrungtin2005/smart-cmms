import 'asset_details.dart';
import 'asset_identifier.dart';

abstract interface class AssetRepository {
  Future<AssetDetails> lookup(AssetIdentifier identifier);
}
