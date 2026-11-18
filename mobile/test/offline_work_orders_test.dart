import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as path;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:uuid/uuid.dart';
import 'package:smart_cmms_mobile/core/local/local_operation.dart';
import 'package:smart_cmms_mobile/core/local/local_store.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/core/network/connection_monitor.dart';
import 'package:smart_cmms_mobile/features/assets/data/offline_asset_repository.dart';
import 'package:smart_cmms_mobile/features/assets/domain/asset_identifier.dart';
import 'package:smart_cmms_mobile/features/work_orders/data/offline_work_order_repository.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order.dart';

import 'support/auth_fixtures.dart';
import 'support/work_order_fixtures.dart';
import 'support/asset_fixtures.dart';

void main() {
  sqfliteFfiInit();
  late LocalStore store;
  late ConnectionMonitor connection;
  late FakeWorkOrderRepository remote;
  late OfflineWorkOrderRepository repo;
  late String file;
  final user = technician.id;
  const report = CompletionDraft(
      rootCause: 'Vòng bi mòn',
      solution: 'Thay vòng bi và chạy thử',
      notes: 'Đã kiểm tra an toàn');
  LocalStore makeStore([String scope = 'test-api']) => LocalStore(
      scope: scope, factory: databaseFactoryFfiNoIsolate, databasePath: file);
  OfflineWorkOrderRepository makeRepo() => OfflineWorkOrderRepository(
      remote: remote, store: store, connection: connection);
  setUp(() {
    file = path.join(
        Directory.systemTemp.path, 'sv05-offline-${const Uuid().v4()}.db');
    store = makeStore();
    remote = FakeWorkOrderRepository();
    connection = ConnectionMonitor();
    repo = makeRepo();
  });
  tearDown(() async {
    await store.close();
    await connection.close();
    for (final suffix in ['', '-wal', '-shm', '-journal']) {
      final f = File(file + suffix);
      if (await f.exists()) await f.delete();
    }
  });
  Future<WorkOrder> download() async {
    final list = await repo.assigned(user);
    final job = await repo.detail(list.items.first.id, user);
    await repo.materials(job.id, user);
    await repo.parts(user);
    return job;
  }

  test('SQLite cache and Unicode drafts survive close/reopen', () async {
    final job = await download();
    await repo.saveDraft(
        user,
        job.id,
        const SavedWorkDraft(
            report: report,
            material: MaterialDraft(
                parts: [PartSelection(fixturePart, 2)],
                notes: 'Vật tư dự kiến'),
            reviewRequired: true));
    await store.close();
    store = makeStore();
    repo = makeRepo();
    connection.setOffline(true);
    final reopened = await repo.detail(job.id, user);
    final draft = (await repo.loadDraft(user, job.id))!;
    expect(reopened.title, job.title);
    expect(reopened.cachedAt, isNotNull);
    expect(draft.report.solution, report.solution);
    expect(draft.material.parts.single.quantity, 2);
    expect(draft.material.notes, 'Vật tư dự kiến');
    expect(draft.reviewRequired, isTrue);
  });
  test('Accounts and API environments cannot read each other data', () async {
    final job = await download();
    connection.setOffline(true);
    await expectLater(
        repo.assigned('different-user'), throwsA(isA<WorkOrderValidation>()));
    expect(await repo.queuedOperations('different-user'), isEmpty);
    await store.close();
    store = makeStore('other-api');
    expect(await store.read(user, 'order', job.id), isNull);
    expect(await store.operations(user), isEmpty);
    await store.close();
    store = makeStore();
    expect(await store.read(user, 'order', job.id), isNotNull);
  });
  test('No offline data is invented before first download', () async {
    connection.setOffline(true);
    await expectLater(repo.assigned(user), throwsA(isA<WorkOrderValidation>()));
    await expectLater(
        repo.detail(workId, user), throwsA(isA<WorkOrderValidation>()));
    expect(await repo.queuedOperations(user), isEmpty);
  });
  test('Offline filters and part search use downloaded pages', () async {
    final job = await download();
    connection.setOffline(true);
    final jobs = await repo.assigned(user, priority: job.priority);
    expect(jobs.items.every((w) => w.priority == job.priority), isTrue);
    expect(jobs.items.any((w) => w.id == job.id), isTrue);
    final parts = await repo.parts(user);
    final match = await repo.parts(user, search: parts.items.first.code);
    expect(match.items.single.id, parts.items.first.id);
    expect(match.cachedAt, isNotNull);
  });
  test('Only transport failures fall back to cache, not bad responses',
      () async {
    final job = await download();
    remote.detailError =
        const ApiException('Disconnected', isConnectionFailure: true);
    expect((await repo.detail(job.id, user)).cachedAt, isNotNull);
    connection.setOffline(false);
    remote.detailError = const ApiException('Malformed response');
    await expectLater(repo.detail(job.id, user), throwsA(isA<ApiException>()));
    remote.detailError = const ApiException('Unavailable', statusCode: 503);
    await expectLater(repo.detail(job.id, user), throwsA(isA<ApiException>()));
    expect(connection.offline, isFalse);
  });
  test('Revoked job is removed from cached detail and lists', () async {
    final job = await download();
    remote.detailError = const ApiException('Forbidden', statusCode: 403);
    await expectLater(repo.detail(job.id, user), throwsA(isA<ApiException>()));
    connection.setOffline(true);
    await expectLater(
        repo.detail(job.id, user), throwsA(isA<WorkOrderValidation>()));
    await expectLater(repo.assigned(user), throwsA(isA<WorkOrderValidation>()));
  });
  test(
      'Ordered local start/pause/resume/complete survives restart without server writes',
      () async {
    var job = await download();
    connection.setOffline(true);
    job = await repo.start(job, user);
    final startedAt = job.startedAt;
    job = await repo.pause(job, 'Chờ dụng cụ', user);
    job = await repo.start(job, user);
    expect(job.startedAt, startedAt);
    job = await repo.complete(job, report, user);
    expect(job.pendingSync, isTrue);
    expect(job.status, WorkOrderStatus.completed);
    expect(remote.starts, 0);
    expect(remote.completions, 0);
    final before = await repo.queuedOperations(user);
    expect(before.map((o) => o.type), [
      'START_WORK_ORDER',
      'PAUSE_WORK_ORDER',
      'RESUME_WORK_ORDER',
      'COMPLETE_WORK_ORDER'
    ]);
    expect(before.every((o) => o.status == 'PENDING'), isTrue);
    expect(before.map((o) => o.uuid).toSet().length, 4);
    expect(before[1].payload['dependsOn'], before[0].uuid);
    await store.close();
    store = makeStore();
    repo = makeRepo();
    final persisted = await repo.detail(job.id, user);
    expect(persisted.rootCause, report.rootCause);
    expect(persisted.pendingSync, isTrue);
    expect((await repo.queuedOperations(user)).map((o) => o.uuid),
        before.map((o) => o.uuid));
    // Reconnection cannot overwrite unsent work or send it via old APIs.
    connection.setOffline(false);
    expect((await repo.detail(job.id, user)).status, WorkOrderStatus.completed);
    expect(remote.completions, 0);
  });
  test('Material intent never deducts stock, pending blocks completion',
      () async {
    var job = await download();
    final part = (await repo.parts(user)).items.first;
    connection.setOffline(true);
    job = await repo.start(job, user);
    final request = await repo.requestMaterials(
        job,
        MaterialDraft(
            parts: [PartSelection(part, 2)], notes: 'Cần thay vòng bi'),
        user);
    expect(request.pendingSync, isTrue);
    expect((await repo.materials(job.id, user)).total, 1);
    expect((await repo.parts(user)).items.first.stock, part.stock);
    await expectLater(
        repo.complete(job, report, user), throwsA(isA<WorkOrderValidation>()));
    await repo.cancelMaterial(request, 'Không cần nữa', user);
    expect(
        (await repo.materials(job.id, user, status: MaterialStatus.pending))
            .total,
        0);
    job = await repo.complete(job, report, user);
    expect(job.pendingSync, isTrue);
    expect(remote.materialCreates, 0);
    expect(remote.completions, 0);
  });
  test('Two concurrent starts do not queue the same transition twice',
      () async {
    final job = await download();
    connection.setOffline(true);
    final first = repo.start(job, user);
    final duplicate = repo.start(job, user);
    await expectLater(duplicate, throwsA(isA<WorkOrderValidation>()));
    await first;
    expect((await repo.queuedOperations(user)).length, 1);
  });
  test('Uncertain online POST is never converted to a second queued request',
      () async {
    final job = await repo.start(await download(), user);
    remote.materialHook = (_, __, ___) async =>
        throw const ApiException('Lost response', isConnectionFailure: true);
    await expectLater(
        repo.requestMaterials(job,
            const MaterialDraft(parts: [PartSelection(fixturePart, 1)]), user),
        throwsA(isA<ApiException>()));
    expect(remote.materialCreates, 1);
    expect(await repo.queuedOperations(user), isEmpty);
  });
  test('Missing pending pagination snapshot does not imply zero pending',
      () async {
    var job = await download();
    await store.put(user, 'materials', 'materials:${job.id}:all:1',
        {'items': [], 'page': 1, 'totalPages': 2, 'total': 21});
    connection.setOffline(true);
    job = await repo.start(job, user);
    await expectLater(
        repo.complete(job, report, user), throwsA(isA<WorkOrderValidation>()));
    expect((await repo.queuedOperations(user)).length, 1);
  });
  test('Expired local session cannot read cache or create operations',
      () async {
    final job = await download();
    repo = OfflineWorkOrderRepository(
        remote: remote,
        store: store,
        connection: connection,
        checkAccess: (_) async =>
            throw const ApiException('Expired', statusCode: 401));
    connection.setOffline(true);
    await expectLater(repo.detail(job.id, user), throwsA(isA<ApiException>()));
    await expectLater(repo.start(job, user), throwsA(isA<ApiException>()));
    expect(await store.operations(user), isEmpty);
  });
  test('Offline list reflects a newer successful online transition', () async {
    final job = await download();
    await repo.start(job, user);
    connection.setOffline(true);
    final list = await repo.assigned(user);
    expect(list.items.first.status, WorkOrderStatus.inProgress);
    expect(list.items.first.pendingSync, isFalse);
  });
  test('Fresh full material snapshot supersedes an older pending query',
      () async {
    var job = await download();
    await store.put(user, 'materials', 'materials:${job.id}:pending:1',
        {'items': [], 'total': 1, 'totalPages': 1});
    await store.put(user, 'materials', 'materials:${job.id}:all:1',
        {'items': [], 'total': 0, 'totalPages': 0});
    connection.setOffline(true);
    job = await repo.start(job, user);
    expect((await repo.complete(job, report, user)).pendingSync, isTrue);
  });
  test('Asset inspection uses cache with history and remains account-scoped',
      () async {
    var assetUser = user;
    final assets = OfflineAssetRepository(
        remote: FakeAssetRepository(),
        store: store,
        connection: connection,
        currentUserId: () async => assetUser);
    final id = AssetIdentifier.parse(demoAsset.code);
    expect((await assets.lookup(id)).cachedAt, isNull);
    connection.setOffline(true);
    final cached = await assets.lookup(id);
    expect(cached.name, demoAsset.name);
    expect(cached.recentHistory.length, demoAsset.recentHistory.length);
    expect(cached.cachedAt, isNotNull);
    assetUser = 'another-account';
    await expectLater(assets.lookup(id), throwsA(isA<ApiException>()));
  });
  test('Cached inspection still rejects a QR with another asset UUID',
      () async {
    final assets = OfflineAssetRepository(
        remote: FakeAssetRepository(),
        store: store,
        connection: connection,
        currentUserId: () async => user);
    await assets.lookup(AssetIdentifier.parse(demoAsset.code));
    connection.setOffline(true);
    final qr =
        '{"app":"SMART_CMMS","v":"1.0","assetCode":"${demoAsset.code}","assetId":"22222222-3333-4444-8555-666666666666"}';
    await expectLater(
        assets.lookup(AssetIdentifier.parse(qr)), throwsA(isA<ApiException>()));
  });
  test('Asset 404 removes the old inspection instead of reviving it offline',
      () async {
    final remoteAssets = FakeAssetRepository();
    final assets = OfflineAssetRepository(
        remote: remoteAssets,
        store: store,
        connection: connection,
        currentUserId: () async => user);
    final id = AssetIdentifier.parse(demoAsset.code);
    await assets.lookup(id);
    remoteAssets.error = const ApiException('Not found', statusCode: 404);
    await expectLater(assets.lookup(id), throwsA(isA<ApiException>()));
    connection.setOffline(true);
    await expectLater(assets.lookup(id), throwsA(isA<ApiException>()));
  });
  test('Failed queue insert rolls back its projection', () async {
    final operation = LocalOperation(
        uuid: 'same-uuid',
        type: 'TEST',
        targetId: workId,
        payload: const {},
        createdAt: DateTime.utc(2026));
    await store.enqueue(user, operation, {'status': 'assigned'});
    await expectLater(store.enqueue(user, operation, {'status': 'completed'}),
        throwsA(isA<DatabaseException>()));
    expect((await store.read(user, 'projection', workId))!.data['status'],
        'assigned');
    expect((await store.operations(user)).length, 1);
  });
  test('Queued request clears its material draft in the same durable commit',
      () async {
    var job = await download();
    const material = MaterialDraft(
        parts: [PartSelection(fixturePart, 2)], notes: 'Cần vật tư');
    await repo.saveDraft(
        user, job.id, const SavedWorkDraft(report: report, material: material));
    connection.setOffline(true);
    job = await repo.start(job, user);
    await repo.requestMaterials(job, material, user);
    // No presentation-layer cleanup has run here.
    await store.close();
    store = makeStore();
    repo = makeRepo();
    final saved = (await repo.loadDraft(user, job.id))!;
    expect(saved.material.parts, isEmpty);
    expect(saved.material.notes, isEmpty);
    expect(saved.report.notes, report.notes);
    expect((await repo.queuedOperations(user)).length, 2);
  });
  test('Online POST is durably marked for review before invoking the server',
      () async {
    final job = await repo.start(await download(), user);
    const material = MaterialDraft(parts: [PartSelection(fixturePart, 2)]);
    await repo.saveDraft(
        user, job.id, const SavedWorkDraft(report: report, material: material));
    remote.materialHook = (_, __, ___) async {
      expect((await repo.loadDraft(user, job.id))!.reviewRequired, isTrue);
      throw const ApiException('Lost response', isConnectionFailure: true);
    };
    await expectLater(repo.requestMaterials(job, material, user),
        throwsA(isA<ApiException>()));
    await store.close();
    store = makeStore();
    repo = makeRepo();
    final restored = (await repo.loadDraft(user, job.id))!;
    expect(restored.reviewRequired, isTrue);
    expect(restored.material.parts.single.quantity, 2);
    expect(await repo.queuedOperations(user), isEmpty);
  });
  test(
      'Known online success clears only sent materials and preserves the report',
      () async {
    final job = await repo.start(await download(), user);
    const material = MaterialDraft(parts: [PartSelection(fixturePart, 2)]);
    await repo.saveDraft(
        user, job.id, const SavedWorkDraft(report: report, material: material));
    await repo.requestMaterials(job, material, user);
    final saved = (await repo.loadDraft(user, job.id))!;
    expect(saved.material.parts, isEmpty);
    expect(saved.reviewRequired, isFalse);
    expect(saved.report.solution, report.solution);
  });
}
