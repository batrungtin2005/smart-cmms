import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class TokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> delete();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const tokenKey = 'smart_cmms.auth.access_token.v1';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: tokenKey);

  @override
  Future<void> write(String token) =>
      _storage.write(key: tokenKey, value: token);

  @override
  Future<void> delete() => _storage.delete(key: tokenKey);
}
