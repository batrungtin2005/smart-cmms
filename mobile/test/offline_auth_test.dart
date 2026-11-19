import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/core/network/connection_monitor.dart';
import 'package:smart_cmms_mobile/features/auth/data/auth_remote_data_source.dart';
import 'package:smart_cmms_mobile/features/auth/data/auth_repository_impl.dart';
import 'package:smart_cmms_mobile/features/auth/data/session_store.dart';
import 'support/auth_fixtures.dart';

class MemorySessionStore implements SessionStore {
  SessionSnapshot? value;
  @override
  Future<SessionSnapshot?> read() async => value;
  @override
  Future<void> write(SessionSnapshot s) async {
    value = s;
  }

  @override
  Future<void> delete() async {
    value = null;
  }
}

void main() {
  String jwt({String? subject, Duration remaining = const Duration(hours: 1)}) {
    final payload = base64Url
        .encode(utf8.encode(jsonEncode({
          'sub': subject ?? technician.id,
          'exp': DateTime.now().add(remaining).millisecondsSinceEpoch ~/ 1000,
        })))
        .replaceAll('=', '');
    return 'test-header.$payload.test-signature';
  }

  late MemoryTokenStore tokens;
  late MemorySessionStore sessions;
  late ConnectionMonitor connection;
  setUp(() {
    tokens = MemoryTokenStore(jwt());
    sessions = MemorySessionStore()
      ..value = SessionSnapshot(tokens.token!, technician);
    connection = ConnectionMonitor();
  });
  tearDown(() => connection.close());
  AuthRepositoryImpl repository(
          Future<http.Response> Function(http.Request) handler) =>
      AuthRepositoryImpl(
          tokens: tokens,
          sessions: sessions,
          connection: connection,
          remote: AuthRemoteDataSource(ApiClient(
              baseUrl: Uri.parse('http://test/api/v1'),
              client: MockClient(handler))));

  test('Trusted unexpired session opens offline without requesting a new login',
      () async {
    connection.setOffline(true);
    final repo =
        repository((_) async => throw StateError('Unexpected network'));
    expect((await repo.restoreSession())!.id, technician.id);
    expect(repo.restoredOffline, isTrue);
  });
  test(
      'Transport failure restores the exact previously authenticated token only',
      () async {
    final repo =
        repository((_) async => throw http.ClientException('No network'));
    expect((await repo.restoreSession())!.id, technician.id);
    expect(connection.offline, isTrue);
    expect(repo.restoredOffline, isTrue);
  });
  test(
      'Expired offline session returns to login and clears both secure records',
      () async {
    tokens.token = jwt(remaining: const Duration(seconds: -10));
    sessions.value = SessionSnapshot(tokens.token!, technician);
    connection.setOffline(true);
    expect(
        await repository((_) async => throw StateError('Unexpected network'))
            .restoreSession(),
        isNull);
    expect(tokens.token, isNull);
    expect(sessions.value, isNull);
  });
  test('Mismatched token cannot resurrect an old offline account', () async {
    tokens.token = jwt(subject: 'someone-else');
    connection.setOffline(true);
    await expectLater(
        repository((_) async => throw StateError('Unexpected network'))
            .restoreSession(),
        throwsA(isA<ApiException>()));
  });
  test('A server rejection revokes offline restoration too', () async {
    expect(
        await repository((_) async => failure(401)).restoreSession(), isNull);
    expect(tokens.token, isNull);
    expect(sessions.value, isNull);
  });
  test(
      'Server outage does not bypass authentication using the offline snapshot',
      () async {
    await expectLater(repository((_) async => failure(503)).restoreSession(),
        throwsA(isA<ApiException>()));
    expect(tokens.token, isNotNull);
  });
  test('An unreadable response is not treated as a connectivity failure',
      () async {
    await expectLater(
        repository((_) async => http.Response('bad-json', 200))
            .restoreSession(),
        throwsA(isA<ApiException>()));
  });
  test('Failed logout cannot leave a usable offline profile behind', () async {
    tokens.failDelete = true;
    final repo =
        repository((_) async => throw StateError('Unexpected network'));
    await expectLater(repo.signOut(), throwsStateError);
    expect(sessions.value, isNull);
    connection.setOffline(true);
    await expectLater(repo.restoreSession(), throwsA(isA<ApiException>()));
  });
  test('Local cache lease checks token identity, expiry and account', () async {
    final lease = SessionLease(tokens, sessions);
    expect((await lease.currentUser()).id, technician.id);
    await expectLater(lease.check('other-user'), throwsA(isA<ApiException>()));
    tokens.token = jwt(subject: 'other-user');
    await expectLater(lease.currentUser(), throwsA(isA<ApiException>()));
  });
}
