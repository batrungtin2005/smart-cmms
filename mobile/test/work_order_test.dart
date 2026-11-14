import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/features/work_orders/data/api_work_order_repository.dart';
import 'package:smart_cmms_mobile/features/work_orders/data/demo_work_order_repository.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order.dart';
import 'package:smart_cmms_mobile/features/work_orders/presentation/work_order_controller.dart';

import 'support/auth_fixtures.dart';
import 'support/work_order_fixtures.dart';

void main() {
  ApiWorkOrderRepository apiRepo(
      Future<http.Response> Function(http.Request) handler,
      {String? token = 'session-token'}) {
    final api = ApiClient(
        baseUrl: Uri.parse('http://localhost:3000/api/v1'),
        client: MockClient(handler));
    addTearDown(api.close);
    return ApiWorkOrderRepository(api: api, tokens: MemoryTokenStore(token));
  }

  test(
      'List contract uses authenticated my-tasks and encodes priority/pagination',
      () async {
    final repo = apiRepo((request) async {
      expect(request.url.path, '/api/v1/work-orders/my-tasks');
      expect(request.url.queryParameters,
          {'priority': 'CRITICAL', 'page': '2', 'limit': '20'});
      expect(request.headers['Authorization'], 'Bearer session-token');
      expect(request.url.queryParameters.containsKey('technicianId'), isFalse);
      return success(
          pageJson([orderJson()], page: 2, total: 21, totalPages: 2));
    });
    final page = await repo.assigned(technician.id,
        priority: WorkOrderPriority.critical, page: 2);
    expect(page.items.single.priority, WorkOrderPriority.critical);
    expect(page.hasMore, isFalse);
    expect(repo.isDemo, isFalse);
  });
  test(
      'Summary list can omit detailed parts; missing endpoint never substitutes sample jobs',
      () async {
    final summary = orderJson()
      ..remove('parts')
      ..remove('actualRepairTimeHours');
    final repo = apiRepo((_) async => success(pageJson([summary])));
    expect(
        (await repo.assigned(technician.id)).items.single.code, 'WO-TEST-001');
    final missing = apiRepo((_) async => failure(404));
    await expectLater(
        missing.assigned(technician.id),
        throwsA(
            isA<ApiException>().having((e) => e.statusCode, 'status', 404)));
  });
  test('Rejects foreign assignments and malformed priority/status/pagination',
      () async {
    final cases = [
      pageJson([orderJson(owner: 'someone-else')]),
      pageJson([orderJson()..['priority'] = 'URGENT']),
      pageJson([orderJson()..['status'] = 'UNKNOWN']),
      pageJson([orderJson()], page: 2)
    ];
    for (final payload in cases) {
      final repo = apiRepo((_) async => success(payload));
      await expectLater(
          repo.assigned(technician.id), throwsA(isA<ApiException>()));
    }
  });
  test('Empty list and parts pagination use existing backend double envelope',
      () async {
    final empty = apiRepo((_) async => success(pageJson([], totalPages: 0)));
    expect((await empty.assigned(technician.id)).items, isEmpty);
    final parts = apiRepo((request) async {
      expect(request.url.path, '/api/v1/parts');
      expect(request.url.queryParameters['search'], 'Vòng bi & phớt');
      return success(pageJson([
        {
          'id': stockId,
          'partCode': 'PART-001',
          'name': 'Vòng bi',
          'unit': 'Cái',
          'currentStock': 12
        }
      ]));
    });
    expect(
        (await parts.parts(technician.id, search: ' Vòng bi & phớt '))
            .items
            .single
            .stock,
        12);
  });
  test(
      'Missing token cannot send a request; details must match requested identity',
      () async {
    final missing = apiRepo(
        (_) async => throw StateError('No request expected'),
        token: null);
    await expectLater(
        missing.assigned(technician.id),
        throwsA(
            isA<ApiException>().having((e) => e.statusCode, 'status', 401)));
    final wrong =
        apiRepo((_) async => success(orderJson()..['id'] = 'other-id'));
    await expectLater(
        wrong.detail(workId, technician.id), throwsA(isA<ApiException>()));
  });
  test('Start sends one guarded PATCH and validates returned state', () async {
    final repo = apiRepo((request) async {
      if (request.method == 'GET') return success(orderJson());
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/v1/work-orders/$workId/status');
      expect(request.headers['Authorization'], 'Bearer session-token');
      expect(jsonDecode(request.body),
          {'status': 'IN_PROGRESS', 'expectedStatus': 'ASSIGNED'});
      return success(orderJson(status: 'IN_PROGRESS'));
    });
    final order = await repo.detail(workId, technician.id);
    expect((await repo.start(order, technician.id)).status,
        WorkOrderStatus.inProgress);
  });
  test(
      'Completion submits notes, time and part quantities together without client prices',
      () async {
    final repo = apiRepo((request) async {
      if (request.method == 'GET') {
        return success(orderJson(status: 'IN_PROGRESS'));
      }
      final body = jsonDecode(request.body);
      expect(body, {
        'status': 'COMPLETED',
        'expectedStatus': 'IN_PROGRESS',
        'completionNotes': 'Đã kiểm tra và thay vòng bi.',
        'actualRepairTimeHours': 0.5,
        'parts': [
          {'partId': stockId, 'quantityUsed': 2}
        ]
      });
      return success(orderJson(status: 'COMPLETED'));
    });
    final order = await repo.detail(workId, technician.id);
    final completed = await repo.complete(
        order,
        const CompletionDraft(
            notes: ' Đã kiểm tra và thay vòng bi. ',
            actualHours: 0.5,
            parts: [PartSelection(fixturePart, 2)]),
        technician.id);
    expect(completed.status, WorkOrderStatus.completed);
    expect(completed.parts.single.quantity, 2);
  });
  test('Invalid reports fail before sending a mutation', () async {
    final repo =
        apiRepo((_) async => success(orderJson(status: 'IN_PROGRESS')));
    final order = await repo.detail(workId, technician.id);
    for (final draft in [
      const CompletionDraft(notes: '', actualHours: 1, parts: []),
      const CompletionDraft(notes: 'Fixed', actualHours: 0, parts: []),
      const CompletionDraft(notes: 'Fixed', actualHours: double.nan, parts: []),
      const CompletionDraft(
          notes: 'Fixed',
          actualHours: 1,
          parts: [PartSelection(fixturePart, 13)]),
      const CompletionDraft(notes: 'Fixed', actualHours: 1, parts: [
        PartSelection(fixturePart, 1),
        PartSelection(fixturePart, 1)
      ]),
    ]) {
      await expectLater(repo.complete(order, draft, technician.id),
          throwsA(isA<WorkOrderValidation>()));
    }
    await expectLater(
        repo.start(order, 'other-user'), throwsA(isA<ApiException>()));
  });
  test('Demo preserves technician isolation and commits parts only once',
      () async {
    final repo = DemoWorkOrderRepository();
    final order = (await repo.assigned('one')).items.first;
    await expectLater(
        repo.detail(order.id, 'two'), throwsA(isA<ApiException>()));
    final started = await repo.start(order, 'one');
    final part = (await repo.parts('one')).items.first;
    final draft = CompletionDraft(
        notes: 'Thay vòng bi',
        actualHours: 0.5,
        parts: [PartSelection(part, 2)]);
    await repo.complete(started, draft, 'one');
    await expectLater(
        repo.complete(started, draft, 'one'), throwsA(isA<ApiException>()));
    expect((await repo.parts('one')).items.first.stock, part.stock - 2);
    expect(
        (await repo.assigned('two')).items.any((item) => item.id == order.id),
        isFalse);
  });
  test('Controller ignores stale filtered responses and supports pagination',
      () async {
    final repo = FakeWorkOrderRepository();
    final initial = await repo.delegate.assigned(technician.id);
    final old = Completer<ResultPage<WorkOrder>>();
    repo.listHook = (_, priority, page) async {
      if (priority == null) return old.future;
      return ResultPage(
          items:
              initial.items.where((item) => item.priority == priority).toList(),
          page: page,
          totalPages: 2,
          total: 21);
    };
    final controller = WorkOrderController(repo, technician.id);
    addTearDown(controller.dispose);
    final first = controller.load();
    await controller.load(filter: WorkOrderPriority.high);
    old.complete(initial);
    await first;
    expect(controller.priority, WorkOrderPriority.high);
    expect(
        controller.orders
            .every((item) => item.priority == WorkOrderPriority.high),
        isTrue);
    await controller.load(more: true);
    expect(controller.listPage?.page, 2);
    expect(controller.orders.map((item) => item.id).toSet().length,
        controller.orders.length);
  });
  test('A late list error cannot overwrite an open detail', () async {
    final repo = FakeWorkOrderRepository();
    final order = (await repo.assigned(technician.id)).items.first;
    final pending = Completer<ResultPage<WorkOrder>>();
    repo.listHook = (_, __, ___) => pending.future;
    final controller = WorkOrderController(repo, technician.id);
    addTearDown(controller.dispose);
    final request = controller.load();
    await controller.open(order.id);
    pending.completeError(const ApiException('List failed', statusCode: 503));
    await request;
    expect(controller.selected?.id, order.id);
    expect(controller.error, isNull);
    expect(controller.listError, 'List failed');
  });
  test('A later failure cannot hide an already expired session', () async {
    final repo = FakeWorkOrderRepository();
    final order = (await repo.assigned(technician.id)).items.first;
    final controller = WorkOrderController(repo, technician.id);
    addTearDown(controller.dispose);
    repo.listHook = (_, __, ___) async =>
        throw const ApiException('Expired', statusCode: 401);
    await controller.load();
    repo.detailError = const ApiException('Unavailable', statusCode: 503);
    await controller.open(order.id);
    expect(controller.sessionExpired, isTrue);
  });
  test(
      'Completion validation failure keeps the report editable and explains stock changes',
      () async {
    final repo = FakeWorkOrderRepository();
    final controller = WorkOrderController(repo, technician.id);
    addTearDown(controller.dispose);
    final order = (await repo.assigned(technician.id)).items.first;
    await controller.open(order.id);
    await controller.start();
    repo.completeHook = (_, __, ___) async =>
        throw const ApiException('Invalid', statusCode: 422);
    expect(
        await controller.complete(
            const CompletionDraft(notes: 'Đã sửa', actualHours: 1, parts: [])),
        isFalse);
    expect(controller.selected?.status, WorkOrderStatus.inProgress);
    expect(controller.mustRefresh, isFalse);
    expect(controller.error, contains('tồn kho'));
  });
  test('Duplicate taps do not send duplicate start requests', () async {
    final repo = FakeWorkOrderRepository();
    final controller = WorkOrderController(repo, technician.id);
    addTearDown(controller.dispose);
    final order = (await repo.assigned(technician.id)).items.first;
    await controller.open(order.id);
    final pending = Completer<WorkOrder>();
    repo.startHook = (_, __) => pending.future;
    final first = controller.start();
    expect(await controller.start(), isFalse);
    expect(repo.starts, 1);
    expect(controller.selected?.status, WorkOrderStatus.assigned);
    pending.complete(await repo.delegate.start(order, technician.id));
    expect(await first, isTrue);
  });
  test(
      'Uncertain completion requires refresh and cannot deduct inventory twice',
      () async {
    final repo = FakeWorkOrderRepository();
    final controller = WorkOrderController(repo, technician.id);
    addTearDown(controller.dispose);
    final order = (await repo.assigned(technician.id)).items.first;
    await controller.open(order.id);
    await controller.start();
    final part = (await repo.parts(technician.id)).items.first;
    final draft = CompletionDraft(
        notes: 'Đã sửa xong', actualHours: 1, parts: [PartSelection(part, 2)]);
    repo.completeHook = (order, draft, user) async {
      await repo.delegate.complete(order, draft, user);
      throw const ApiException('Response lost');
    };
    expect(await controller.complete(draft), isFalse);
    expect(controller.mustRefresh, isTrue);
    expect(await controller.complete(draft), isFalse);
    expect(repo.completions, 1);
    await controller.open(order.id);
    expect(controller.mustRefresh, isFalse);
    expect(controller.selected?.status, WorkOrderStatus.completed);
    expect((await repo.parts(technician.id)).items.first.stock, part.stock - 2);
  });
  test(
      'Forbidden detail clears cached protected order; disposed controller ignores late reads',
      () async {
    final repo = FakeWorkOrderRepository();
    final controller = WorkOrderController(repo, technician.id);
    final order = (await repo.assigned(technician.id)).items.first;
    await controller.load();
    await controller.open(order.id);
    repo.detailError = const ApiException('Reassigned', statusCode: 403);
    await controller.open(order.id);
    expect(controller.selectedId, isNull);
    expect(controller.listError, 'Reassigned');
    expect(controller.orders.any((item) => item.id == order.id), isFalse);
    final pending = Completer<ResultPage<WorkOrder>>();
    repo.listHook = (_, __, ___) => pending.future;
    final request = controller.load();
    controller.dispose();
    pending.complete(
        const ResultPage(items: [], page: 1, totalPages: 0, total: 0));
    await request;
  });
}
