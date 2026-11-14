import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:smart_cmms_mobile/app.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/features/work_orders/data/api_work_order_repository.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order_repository.dart';
import 'package:smart_cmms_mobile/features/work_orders/presentation/work_orders_page.dart';

import 'support/asset_fixtures.dart';
import 'support/auth_fixtures.dart';
import 'support/work_order_fixtures.dart';

void main() {
  late FakeWorkOrderRepository repo;
  late FakeAuthRepository auth;
  setUp(() {
    repo = FakeWorkOrderRepository();
    auth = FakeAuthRepository()..restoredUser = technician;
  });

  Future<void> open(WidgetTester tester,
      {WorkOrderRepository? repository}) async {
    await tester.pumpWidget(SmartCmmsApp(
        authRepository: auth,
        assetRepository: FakeAssetRepository(),
        workOrderRepository: repository ?? repo));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Công việc được giao'));
    await tester.pumpAndSettle();
  }

  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  Future<WorkOrder> assigned() async =>
      (await repo.assigned(technician.id)).items.first;
  Future<void> openOrder(WidgetTester tester, WorkOrder order) async {
    await tapVisible(tester, find.byKey(ValueKey('order_${order.id}')));
  }

  Future<void> fillReport(WidgetTester tester, {String hours = '0,5'}) async {
    await tester.ensureVisible(find.byKey(const ValueKey('completion_notes')));
    await tester.enterText(find.byKey(const ValueKey('completion_notes')),
        'Đã kiểm tra và thay vòng bi.');
    await tester.ensureVisible(find.byKey(const ValueKey('actual_hours')));
    await tester.enterText(find.byKey(const ValueKey('actual_hours')), hours);
    await tester.pumpAndSettle();
  }

  testWidgets('Priority filters and empty results reflect the selected filter',
      (tester) async {
    await open(tester);
    expect(find.textContaining('DỮ LIỆU MẪU'), findsOneWidget);
    await tester.tap(find.widgetWithText(ChoiceChip, 'Thấp'));
    await tester.pumpAndSettle();
    expect(find.textContaining('WO-DEMO-004'), findsOneWidget);
    expect(find.textContaining('WO-DEMO-001'), findsNothing);
    repo.listHook = (_, __, page) async =>
        ResultPage(items: [], page: page, totalPages: 0, total: 0);
    await tester.tap(find.widgetWithText(ChoiceChip, 'Cao'));
    await tester.pumpAndSettle();
    expect(find.text('Chưa có công việc phù hợp với bộ lọc.'), findsOneWidget);
  });
  testWidgets(
      'Start, choose parts and confirm completion preserves the report and updates stock',
      (tester) async {
    await open(tester);
    final order = await assigned();
    await openOrder(tester, order);
    await tapVisible(tester, find.text('Bắt đầu làm'));
    expect(repo.starts, 1);
    await fillReport(tester);
    await tapVisible(tester, find.text('Thêm phụ tùng'));
    expect(find.text('Hết hàng'), findsOneWidget);
    final part = (await repo.parts(technician.id)).items.first;
    await tester.tap(find.text(part.name));
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('completion_notes')))
            .controller!
            .text,
        'Đã kiểm tra và thay vòng bi.');
    final quantity = find.byKey(ValueKey('quantity_${part.id}'));
    await tester.ensureVisible(quantity);
    await tester.enterText(quantity, '13');
    await tapVisible(tester, find.text('Hoàn thành'));
    expect(repo.completions, 0);
    expect(find.text('Xác nhận kết quả'), findsNothing);
    await tester.ensureVisible(quantity);
    await tester.enterText(quantity, '2');
    await tapVisible(tester, find.text('Hoàn thành'));
    expect(find.text('Xác nhận kết quả'), findsOneWidget);
    expect(repo.completions, 0);
    await tapVisible(tester, find.text('Xác nhận hoàn thành'));
    expect(repo.completions, 1);
    expect(repo.lastDraft?.actualHours, 0.5);
    expect(repo.lastDraft?.parts.single.quantity, 2);
    expect(find.text('Hoàn thành'), findsNothing);
    await tester
        .ensureVisible(find.text('Đã hoàn thành, chờ quản lý nghiệm thu.'));
    expect(find.text('Đã hoàn thành, chờ quản lý nghiệm thu.'), findsOneWidget);
    expect((await repo.parts(technician.id)).items.first.stock, part.stock - 2);
  });
  testWidgets('Invalid time and quantities never send completion',
      (tester) async {
    await open(tester);
    await openOrder(tester, await assigned());
    await tapVisible(tester, find.text('Bắt đầu làm'));
    await tapVisible(tester, find.text('Hoàn thành'));
    expect(repo.completions, 0);
    expect(find.textContaining('Nhập ghi chú'), findsOneWidget);
    await fillReport(tester, hours: '0');
    await tapVisible(tester, find.text('Hoàn thành'));
    expect(find.textContaining('Thời gian thực hiện phải lớn hơn 0'),
        findsOneWidget);
    expect(find.text('Xác nhận kết quả'), findsNothing);
  });
  testWidgets('Unsaved report requires explicit discard when leaving',
      (tester) async {
    await open(tester);
    await openOrder(tester, await assigned());
    await tapVisible(tester, find.text('Bắt đầu làm'));
    await fillReport(tester);
    await tester.tap(find.byTooltip('Quay lại'));
    await tester.pumpAndSettle();
    expect(find.text('Tiếp tục chỉnh sửa'), findsOneWidget);
    await tester.tap(find.text('Tiếp tục chỉnh sửa'));
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('completion_notes')))
            .controller!
            .text,
        'Đã kiểm tra và thay vòng bi.');
    await tester.tap(find.byTooltip('Quay lại'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bỏ thay đổi'));
    await tester.pumpAndSettle();
    expect(
        find.byKey(ValueKey('order_${(await assigned()).id}')), findsOneWidget);
    expect(repo.completions, 0);
  });
  testWidgets(
      'Uncertain mutation requires refresh, preserves draft, and cannot resend immediately',
      (tester) async {
    await open(tester);
    final order = await assigned();
    await openOrder(tester, order);
    await tapVisible(tester, find.text('Bắt đầu làm'));
    await fillReport(tester);
    repo.completeHook =
        (_, __, ___) async => throw const ApiException('Timeout');
    await tapVisible(tester, find.text('Hoàn thành'));
    await tapVisible(tester, find.text('Xác nhận hoàn thành'));
    expect(repo.completions, 1);
    expect(
        tester
            .widget<FilledButton>(
                find.widgetWithText(FilledButton, 'Hoàn thành'))
            .onPressed,
        isNull);
    expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('completion_notes')))
            .controller!
            .text,
        'Đã kiểm tra và thay vòng bi.');
    await tester.tap(find.byTooltip('Cập nhật công việc'));
    await tester.pumpAndSettle();
    expect(
        tester
            .widget<FilledButton>(
                find.widgetWithText(FilledButton, 'Hoàn thành'))
            .onPressed,
        isNotNull);
    expect(repo.completions, 1);
  });
  testWidgets('Live mode missing API shows an error without showing demo work',
      (tester) async {
    final api = ApiClient(
        baseUrl: Uri.parse('http://localhost/api/v1'),
        client: MockClient((_) async => failure(404)));
    addTearDown(api.close);
    await open(tester,
        repository: ApiWorkOrderRepository(
            api: api, tokens: MemoryTokenStore('token')));
    expect(find.textContaining('Máy chủ chưa hỗ trợ danh sách công việc'),
        findsOneWidget);
    expect(find.textContaining('DỮ LIỆU MẪU'), findsNothing);
    expect(find.textContaining('WO-DEMO-'), findsNothing);
    await tester.tap(find.byTooltip('Quay lại'));
    await tester.pumpAndSettle();
    expect(find.byType(WorkOrdersPage), findsNothing);
  });
  testWidgets(
      'System back dismisses keyboard before asking to discard the draft',
      (tester) async {
    await open(tester);
    await openOrder(tester, await assigned());
    await tapVisible(tester, find.text('Bắt đầu làm'));
    await fillReport(tester);
    tester.view.viewInsets = const FakeViewPadding(bottom: 300);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Bỏ thay đổi'), findsNothing);
    expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('completion_notes')))
            .controller!
            .text,
        'Đã kiểm tra và thay vòng bi.');
    tester.view.resetViewInsets();
    await tester.pumpAndSettle();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Bỏ thay đổi'), findsOneWidget);
  });
  testWidgets('Expired session removes the work-order page', (tester) async {
    repo.listHook = (_, __, ___) async =>
        throw const ApiException('Expired', statusCode: 401);
    await open(tester);
    expect(auth.signOutCalls, 1);
    expect(find.byType(WorkOrdersPage), findsNothing);
    expect(find.text('ĐĂNG NHẬP'), findsOneWidget);
  });
}
