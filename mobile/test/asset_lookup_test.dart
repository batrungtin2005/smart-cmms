import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/features/assets/data/asset_repository_impl.dart';
import 'package:smart_cmms_mobile/features/assets/domain/asset_details.dart';
import 'package:smart_cmms_mobile/features/assets/domain/asset_identifier.dart';
import 'package:smart_cmms_mobile/features/assets/presentation/asset_lookup_controller.dart';

import 'support/asset_fixtures.dart';
import 'support/auth_fixtures.dart';

void main() {
  test('Normalizes a raw asset code without changing its identity', () {
    expect(AssetIdentifier.parse(' ast-pump-001 ').code, 'AST-PUMP-001');
  });
  test('Reads JSON QR labels produced by the backend', () {
    final identifier = AssetIdentifier.parse(qrPayload);
    expect(identifier.code, 'AST-001');
    expect(identifier.expectedId, assetId);
  });
  test('Extracts the code from a legacy label URL', () {
    expect(AssetIdentifier.parse('https://cmms.local/assets/code/AST-001').code,
        'AST-001');
  });
  test('Rejects unrelated, malformed, oversized and unsafe input', () {
    for (final raw in [
      '',
      'hello',
      'AST-../admin',
      'AST-001?x=1',
      'AST-${'A' * 47}',
      '{broken',
      '{"app":"OTHER","assetCode":"AST-001"}',
      qrPayload.replaceFirst('1.0', '2.0'),
      qrPayload.replaceFirst(assetId, 'bad-id'),
      'https://example.test/login',
      'https://cmms.local/assets/code/AST-001?redirect=evil',
      'javascript://cmms.local/assets/code/AST-001',
      'A' * 4097
    ]) {
      expect(() => AssetIdentifier.parse(raw), throwsA(isA<InvalidAssetCode>()),
          reason: 'Unsafe or invalid input must be rejected');
    }
  });

  group('Asset API contract', () {
    late MemoryTokenStore tokens;
    setUp(() => tokens = MemoryTokenStore('saved-token'));
    AssetRepositoryImpl repository(
        Future<http.Response> Function(http.Request) handler) {
      final api = ApiClient(
          baseUrl: Uri.parse('http://localhost:3000/api/v1'),
          client: MockClient(handler));
      addTearDown(api.close);
      return AssetRepositoryImpl(api: api, tokens: tokens);
    }

    test(
        'Uses configured backend and bearer token; parses detail, decimals, history',
        () async {
      final repo = repository((request) async {
        expect(request.url.path, '/api/v1/assets/inspect/AST-001');
        expect(request.headers['Authorization'], 'Bearer saved-token');
        return success(inspectionJson());
      });
      final result = await repo.lookup(AssetIdentifier.parse(qrPayload));
      expect(result.name, demoAsset.name);
      expect(result.operatingHours, 1250.5);
      expect(result.location, 'Dây chuyền 1');
      expect(result.specifications['Công suất'], '7,5 kW');
      expect(
          result.recentHistory.single.performedBy, 'Kỹ thuật viên thử nghiệm');
    });
    test('An external URL never redirects the request to its host', () async {
      final repo = repository((request) async {
        expect(request.url.host, 'localhost');
        return success(inspectionJson());
      });
      await repo.lookup(
          AssetIdentifier.parse('https://external.test/assets/code/AST-001'));
    });
    test('Missing token fails before any network request', () async {
      tokens.token = null;
      final repo =
          repository((_) async => throw StateError('Unexpected request'));
      await expectLater(
          repo.lookup(AssetIdentifier.parse('AST-001')),
          throwsA(
              isA<ApiException>().having((e) => e.statusCode, 'status', 401)));
    });
    test('Not found is distinguished from server failure', () async {
      final repo = repository((_) async => failure(404));
      await expectLater(
          repo.lookup(AssetIdentifier.parse('AST-001')),
          throwsA(isA<ApiException>().having((e) => e.message, 'message',
              contains('Không tìm thấy tài sản'))));
    });
    test('Rejects a label whose UUID differs from the backend asset', () async {
      final repo = repository((_) async => success(inspectionJson()));
      await expectLater(
          repo.lookup(AssetIdentifier.parse(qrPayload.replaceFirst(
              assetId, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'))),
          throwsA(isA<ApiException>()));
    });
    test('Accepts absent optional details and an empty maintenance history',
        () async {
      final json = inspectionJson();
      final asset = json['asset'] as Map<String, Object?>;
      asset['location'] = null;
      asset['specifications'] = null;
      json['recentMaintenanceHistory'] = [];
      final repo = repository((_) async => success(json));
      final result = await repo.lookup(AssetIdentifier.parse('AST-001'));
      expect(result.location, isNull);
      expect(result.specifications, isEmpty);
      expect(result.recentHistory, isEmpty);
    });
    test('Malformed detail does not display an invented device', () async {
      final json = inspectionJson();
      (json['asset'] as Map<String, Object?>)['operatingHours'] = 'NaN';
      final repo = repository((_) async => success(json));
      await expectLater(repo.lookup(AssetIdentifier.parse('AST-001')),
          throwsA(isA<ApiException>()));
    });
  });

  test('Repeated camera frames result in one request until explicit reset',
      () async {
    final pending = Completer<AssetDetails>();
    final repo = FakeAssetRepository()..pending = pending.future;
    final controller = AssetLookupController(repo);
    addTearDown(controller.dispose);
    final first = controller.lookup(qrPayload);
    await controller.lookup(qrPayload);
    expect(repo.calls, 1);
    pending.complete(demoAsset);
    await first;
    await controller.lookup(qrPayload);
    expect(repo.calls, 1);
    controller.reset();
    await controller.lookup(qrPayload);
    expect(repo.calls, 2);
  });
  test('Invalid codes make no network request and allow a corrected retry',
      () async {
    final repo = FakeAssetRepository();
    final controller = AssetLookupController(repo);
    addTearDown(controller.dispose);
    await controller.lookup('unrelated-QR');
    expect(repo.calls, 0);
    expect(controller.error, isNotNull);
    controller.reset();
    await controller.lookup('AST-001');
    expect(controller.asset?.id, assetId);
  });
  test('Network errors allow retry; only 401 expires the login session',
      () async {
    final repo = FakeAssetRepository()..error = const ApiException('Offline');
    final controller = AssetLookupController(repo);
    addTearDown(controller.dispose);
    for (final status in [null, 403, 401]) {
      repo.error = ApiException('Unavailable', statusCode: status);
      controller.reset();
      await controller.lookup('AST-001');
      expect(controller.sessionExpired, status == 401);
    }
    repo.error = null;
    controller.reset();
    await controller.lookup('AST-001');
    expect(controller.asset, isNotNull);
  });
  test(
      'Leaving during lookup ignores late responses without notifying disposed UI',
      () async {
    final pending = Completer<AssetDetails>();
    final controller =
        AssetLookupController(FakeAssetRepository()..pending = pending.future);
    final request = controller.lookup('AST-001');
    controller.dispose();
    pending.complete(demoAsset);
    await request;
    expect(controller.asset, isNull);
  });
}
