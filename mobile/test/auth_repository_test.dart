import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/features/auth/data/auth_remote_data_source.dart';
import 'package:smart_cmms_mobile/features/auth/data/auth_repository_impl.dart';

import 'support/auth_fixtures.dart';

void main() {
  late MemoryTokenStore tokens;

  AuthRepositoryImpl repository(
      FutureOr<http.Response> Function(http.Request) handler,
      {Duration timeout = const Duration(seconds: 15)}) {
    final api = ApiClient(
      baseUrl: Uri.parse('http://localhost:3000/api/v1/'),
      client: MockClient((request) async => await handler(request)),
      timeout: timeout,
    );
    addTearDown(api.close);
    return AuthRepositoryImpl(
        remote: AuthRemoteDataSource(api), tokens: tokens);
  }

  setUp(() => tokens = MemoryTokenStore());

  test('Login follows backend contract and stores only the access token',
      () async {
    final repo = repository((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/v1/auth/login');
      expect(jsonDecode(request.body),
          {'username': 'tech', 'password': ' secret password '});
      expect(request.headers.containsKey('Authorization'), isFalse);
      return success({
        'accessToken': 'session-token',
        'tokenType': 'Bearer',
        'user': userJson()
      });
    });

    final user = await repo.signIn(' tech ', ' secret password ');
    expect(user.fullName, technician.fullName);
    expect(user.role, 'TECHNICIAN');
    expect(tokens.token, 'session-token');
  });

  test('Wrong credentials never create a session', () async {
    final repo = repository((_) async => failure(401));
    await expectLater(
        repo.signIn('tech', 'wrong-password'),
        throwsA(
            isA<ApiException>().having((e) => e.statusCode, 'status', 401)));
    expect(tokens.token, isNull);
  });

  for (final role in ['ADMIN', 'MAINTENANCE_MANAGER', 'WAREHOUSE_KEEPER']) {
    test('A $role login is not saved as a technician session', () async {
      final repo = repository((_) async => success({
            'accessToken': 'not-saved',
            'tokenType': 'Bearer',
            'user': userJson(role: role),
          }));
      await expectLater(
          repo.signIn('other', 'Password@123'),
          throwsA(
              isA<ApiException>().having((e) => e.statusCode, 'status', 403)));
      expect(tokens.token, isNull);
    });
  }

  test('Inactive technicians are rejected before token persistence', () async {
    final repo = repository((_) async => success({
          'accessToken': 'not-saved',
          'tokenType': 'Bearer',
          'user': userJson(active: false),
        }));
    await expectLater(
        repo.signIn('tech', 'Password@123'), throwsA(isA<ApiException>()));
    expect(tokens.token, isNull);
  });

  test('Malformed login payload is rejected before token persistence',
      () async {
    final repo = repository(
        (_) async => success({'accessToken': '', 'user': userJson()}));
    await expectLater(
        repo.signIn('tech', 'Password@123'), throwsA(isA<ApiException>()));
    expect(tokens.token, isNull);
  });

  test('Successful HTTP with invalid JSON never authenticates', () async {
    final repo =
        repository((_) async => http.Response('<html>proxy error</html>', 200));
    await expectLater(
        repo.signIn('tech', 'Password@123'), throwsA(isA<ApiException>()));
    expect(tokens.token, isNull);
  });

  test('A session is not reported successful when secure storage fails',
      () async {
    tokens.failWrite = true;
    final repo = repository((_) async => success({
          'accessToken': 'not-saved',
          'tokenType': 'Bearer',
          'user': userJson(),
        }));
    await expectLater(repo.signIn('tech', 'Password@123'), throwsStateError);
    expect(tokens.token, isNull);
  });

  test('Restore validates saved token with the real profile endpoint contract',
      () async {
    tokens.token = 'saved-token';
    final repo = repository((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/v1/auth/me');
      expect(request.headers['Authorization'], 'Bearer saved-token');
      return success(userJson());
    });
    expect((await repo.restoreSession())?.id, technician.id);
  });

  test('Restore without a token makes no network request', () async {
    final repo =
        repository((_) async => throw StateError('Unexpected request'));
    expect(await repo.restoreSession(), isNull);
  });

  test('Expired or invalid saved token is cleared', () async {
    tokens.token = 'expired-token';
    final repo = repository((_) async => failure(401));
    expect(await repo.restoreSession(), isNull);
    expect(tokens.token, isNull);
  });

  test('Saved session is cleared if server changes user role', () async {
    tokens.token = 'previous-technician-token';
    final repo = repository((_) async => success(userJson(role: 'ADMIN')));
    expect(await repo.restoreSession(), isNull);
    expect(tokens.token, isNull);
  });

  test('Server outage preserves saved token for retry', () async {
    tokens.token = 'saved-token';
    final repo = repository((_) async => failure(503, 'Unavailable'));
    await expectLater(repo.restoreSession(), throwsA(isA<ApiException>()));
    expect(tokens.token, 'saved-token');
  });

  test('Connection failure preserves saved token for retry', () async {
    tokens.token = 'saved-token';
    final repo = repository((_) async => throw http.ClientException('offline'));
    await expectLater(repo.restoreSession(), throwsA(isA<ApiException>()));
    expect(tokens.token, 'saved-token');
  });

  test('Network requests have a bounded timeout', () async {
    tokens.token = 'saved-token';
    final pending = Completer<http.Response>();
    final repo = repository((_) => pending.future,
        timeout: const Duration(milliseconds: 5));
    await expectLater(repo.restoreSession(), throwsA(isA<ApiException>()));
    expect(tokens.token, 'saved-token');
    pending.complete(success(userJson()));
  });

  test('Logout deletes the persisted token', () async {
    tokens.token = 'saved-token';
    final repo =
        repository((_) async => throw StateError('Unexpected request'));
    await repo.signOut();
    expect(tokens.token, isNull);
  });
}
