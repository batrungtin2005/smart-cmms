import 'dart:convert';

class InvalidAssetCode implements Exception {
  const InvalidAssetCode();

  @override
  String toString() =>
      'Mã không hợp lệ. Hãy quét tem Smart CMMS hoặc nhập mã AST-xxx.';
}

class AssetIdentifier {
  const AssetIdentifier._(this.code, this.expectedId);

  final String code;
  final String? expectedId;

  static final _codePattern = RegExp(r'^AST-[A-Z0-9]+(?:-[A-Z0-9]+)*$');
  static final _idPattern = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      caseSensitive: false);

  factory AssetIdentifier.parse(String raw) {
    final input = raw.trim();
    if (input.isEmpty || input.length > 4096) throw const InvalidAssetCode();
    String code = input;
    String? expectedId;
    if (input.startsWith('{')) {
      Object? decoded;
      try {
        decoded = jsonDecode(input);
      } on FormatException {
        throw const InvalidAssetCode();
      }
      if (decoded is! Map<String, dynamic> ||
          decoded['app'] != 'SMART_CMMS' ||
          decoded['v'] != '1.0' ||
          decoded['assetCode'] is! String ||
          decoded['assetId'] is! String ||
          !_idPattern.hasMatch(decoded['assetId'] as String)) {
        throw const InvalidAssetCode();
      }
      code = decoded['assetCode'] as String;
      expectedId = (decoded['assetId'] as String).toLowerCase();
    } else if (input.contains('://')) {
      final uri = Uri.tryParse(input);
      if (uri == null ||
          !['http', 'https'].contains(uri.scheme) ||
          !uri.hasAuthority ||
          uri.userInfo.isNotEmpty ||
          uri.hasQuery ||
          uri.hasFragment) {
        throw const InvalidAssetCode();
      }
      final segments = uri.pathSegments;
      if (segments.length < 3 ||
          segments[segments.length - 3] != 'assets' ||
          segments[segments.length - 2] != 'code') {
        throw const InvalidAssetCode();
      }
      // Extract only the code. Never request a URL supplied by a QR label.
      code = segments.last;
    }
    code = code.trim().toUpperCase();
    if (code.length > 50 || !_codePattern.hasMatch(code)) {
      throw const InvalidAssetCode();
    }
    return AssetIdentifier._(code, expectedId);
  }
}
