import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:smart_cmms_mobile/features/auth/data/token_store.dart';
import 'package:smart_cmms_mobile/features/auth/domain/auth_repository.dart';
import 'package:smart_cmms_mobile/features/auth/domain/auth_user.dart';

const technician = AuthUser(
  id: 'technician-id',
  username: 'tech',
  fullName: 'Kỹ thuật viên thử nghiệm',
  email: 'tech@example.com',
  role: 'TECHNICIAN',
  isActive: true,
);

Map<String, Object?> userJson(
        {String role = 'TECHNICIAN', bool active = true}) =>
    {
      'id': technician.id,
      'username': technician.username,
      'fullName': technician.fullName,
      'email': technician.email,
      'role': {'id': 3, 'name': role},
      'isActive': active,
    };

http.Response success(Object? data) => http.Response(
      jsonEncode({'success': true, 'statusCode': 200, 'data': data}),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

http.Response failure(int status, [String message = 'Invalid credentials']) =>
    http.Response(jsonEncode({'success': false, 'message': message}), status,
        headers: {'content-type': 'application/json; charset=utf-8'});

class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this.token]);
  String? token;
  bool failWrite = false;
  bool failDelete = false;

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String value) async {
    if (failWrite) throw StateError('Storage unavailable');
    token = value;
  }

  @override
  Future<void> delete() async {
    if (failDelete) throw StateError('Storage unavailable');
    token = null;
  }
}

class FakeAuthRepository implements AuthRepository {
  AuthUser? restoredUser;
  Object? restoreError;
  Object? signInError;
  Object? signOutError;
  Future<AuthUser>? pendingSignIn;
  int signInCalls = 0;
  int signOutCalls = 0;

  @override
  Future<AuthUser?> restoreSession() async {
    if (restoreError != null) throw restoreError!;
    return restoredUser;
  }

  @override
  Future<AuthUser> signIn(String username, String password) async {
    signInCalls++;
    if (signInError != null) throw signInError!;
    if (pendingSignIn != null) return await pendingSignIn!;
    return technician;
  }

  @override
  Future<void> signOut() async {
    signOutCalls++;
    if (signOutError != null) throw signOutError!;
    restoredUser = null;
  }
}
