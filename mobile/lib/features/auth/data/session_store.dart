import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/network/api_client.dart';
import '../domain/auth_user.dart';
import 'token_store.dart';

class SessionSnapshot {
  const SessionSnapshot(this.token, this.user);
  final String token;
  final AuthUser user;

  // Only snapshots written after server authentication are accepted. Parsing
  // exp/sub here does not replace server-side JWT signature verification.
  bool validAt(DateTime now) {
    try {
      final pieces = token.split('.');
      if (pieces.length != 3) return false;
      final payload = jsonDecode(
              utf8.decode(base64Url.decode(base64Url.normalize(pieces[1]))))
          as Map<String, dynamic>;
      final exp = payload['exp'];
      return user.isActive &&
          user.role == 'TECHNICIAN' &&
          payload['sub'] == user.id &&
          exp is num &&
          exp.isFinite &&
          now.millisecondsSinceEpoch / 1000 < exp &&
          (payload['nbf'] == null ||
              (payload['nbf'] is num &&
                  now.millisecondsSinceEpoch / 1000 >= payload['nbf']));
    } catch (_) {
      return false;
    }
  }
}

abstract interface class SessionStore {
  Future<SessionSnapshot?> read();
  Future<void> write(SessionSnapshot session);
  Future<void> delete();
}

class SecureSessionStore implements SessionStore {
  SecureSessionStore({required this.scope, FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();
  static const key = 'smart_cmms.auth.offline_session.v1';
  final String scope;
  final FlutterSecureStorage _storage;
  @override
  Future<SessionSnapshot?> read() async {
    final text = await _storage.read(key: key);
    if (text == null) return null;
    try {
      final data = jsonDecode(text) as Map<String, dynamic>;
      if (data['scope'] != scope) return null;
      final u = data['user'] as Map<String, dynamic>;
      return SessionSnapshot(
          data['token'],
          AuthUser(
              id: u['id'],
              username: u['username'],
              fullName: u['fullName'],
              email: u['email'],
              role: u['role'],
              isActive: u['isActive']));
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(SessionSnapshot s) => _storage.write(
      key: key,
      value: jsonEncode({
        'scope': scope,
        'token': s.token,
        'user': {
          'id': s.user.id,
          'username': s.user.username,
          'fullName': s.user.fullName,
          'email': s.user.email,
          'role': s.user.role,
          'isActive': s.user.isActive
        }
      }));
  @override
  Future<void> delete() => _storage.delete(key: key);
}

class SessionLease {
  const SessionLease(this.tokens, this.sessions);
  final TokenStore tokens;
  final SessionStore sessions;
  Future<AuthUser> currentUser() async {
    final saved = await sessions.read();
    final token = await tokens.read();
    if (saved == null ||
        saved.token != token ||
        !saved.validAt(DateTime.now())) {
      throw const ApiException(
          'Phiên đăng nhập đã hết hạn. Cần đăng nhập lại khi có mạng.',
          statusCode: 401);
    }
    return saved.user;
  }

  Future<void> check(String user) async {
    if ((await currentUser()).id != user) {
      throw const ApiException('Dữ liệu thuộc tài khoản khác.',
          statusCode: 403);
    }
  }
}
