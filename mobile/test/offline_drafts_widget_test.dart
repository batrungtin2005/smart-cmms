import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_cmms_mobile/app.dart';
import 'package:smart_cmms_mobile/core/local/local_operation.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/local_work_orders.dart';
import 'package:smart_cmms_mobile/features/work_orders/domain/work_order.dart';
import 'support/auth_fixtures.dart';
import 'support/asset_fixtures.dart';
import 'support/work_order_fixtures.dart';

class LocalWidgetRepository extends FakeWorkOrderRepository
    implements LocalWorkOrders {
  final drafts = <String, SavedWorkDraft>{};
  bool failSave = false;
  bool cachedReads = false;
  @override
  Future<WorkOrder> detail(String id, String user) async {
    final job = await super.detail(id, user);
    return cachedReads ? job.copyWith(cachedAt: DateTime.now()) : job;
  }

  @override
  Future<ResultPage<MaterialRequest>> materials(String id, String user,
      {MaterialStatus? status, int page = 1}) async {
    final result = await super.materials(id, user, status: status, page: page);
    return ResultPage(
        items: result.items,
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
        cachedAt: cachedReads ? DateTime.now() : null);
  }

  @override
  bool get offline => false;
  @override
  Stream<void> get connectionChanges => const Stream.empty();
  @override
  Future<void> recheckConnection() async {}
  @override
  Future<SavedWorkDraft?> loadDraft(String user, String id) async =>
      drafts['$user:$id'];
  @override
  Future<void> saveDraft(String user, String id, SavedWorkDraft draft) async {
    if (failSave) throw StateError('Disk full');
    drafts['$user:$id'] = draft;
  }

  @override
  Future<void> deleteDraft(String user, String id) async {
    drafts.remove('$user:$id');
  }

  @override
  Future<List<LocalOperation>> queuedOperations(String user) async => [];
}

void main() {
  late LocalWidgetRepository repo;
  setUp(() => repo = LocalWidgetRepository());
  Future<void> mount(WidgetTester tester) async {
    await tester.pumpWidget(SmartCmmsApp(
        authRepository: FakeAuthRepository()..restoredUser = technician,
        assetRepository: FakeAssetRepository(),
        workOrderRepository: repo));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Công việc được giao'));
    await tester.pumpAndSettle();
    final first = (await repo.assigned(technician.id)).items.first;
    await tester.tap(find.byKey(ValueKey('order_${first.id}')));
    await tester.pumpAndSettle();
  }

  Future<void> reveal(WidgetTester tester, Finder finder) async {
    final scrollable = find.byType(Scrollable).first;
    if (finder.evaluate().isEmpty) {
      tester.state<ScrollableState>(scrollable).position.jumpTo(0);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(finder, 250,
          scrollable: scrollable, maxScrolls: 40);
    }
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
  }

  Future<void> start(WidgetTester tester) async {
    await reveal(tester, find.text('Bắt đầu làm'));
    await tester.tap(find.text('Bắt đầu làm'));
    await tester.pumpAndSettle();
  }

  testWidgets(
      'Report autosaves and restores after page process state is removed',
      (tester) async {
    await mount(tester);
    await start(tester);
    for (final entry in {
      'root_cause': 'Vòng bi mòn',
      'solution': 'Thay vòng bi',
      'completion_notes': 'Đã chạy thử'
    }.entries) {
      final field = find.byKey(ValueKey(entry.key));
      await reveal(tester, field);
      await tester.enterText(field, entry.value);
      await tester.pumpAndSettle();
    }
    expect(repo.drafts.values.single.report.notes, 'Đã chạy thử');
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
    await mount(tester);
    final root = find.byKey(const ValueKey('root_cause'));
    await reveal(tester, root);
    expect(tester.widget<TextField>(root).controller!.text, 'Vòng bi mòn');
    expect(repo.drafts.values.single.report.solution, 'Thay vòng bi');
  });
  testWidgets('Autosave feedback never drops focus after the first character',
      (tester) async {
    await mount(tester);
    await start(tester);
    final root = find.byKey(const ValueKey('root_cause'));
    await reveal(tester, root);
    await tester.enterText(root, 'O');
    await tester.pumpAndSettle();
    final editable = tester.widget<EditableText>(
        find.descendant(of: root, matching: find.byType(EditableText)));
    expect(editable.focusNode.hasFocus, isTrue);
    tester.testTextInput.updateEditingValue(const TextEditingValue(
        text: 'Offline cause', selection: TextSelection.collapsed(offset: 13)));
    await tester.pumpAndSettle();
    expect(repo.drafts.values.single.report.rootCause, 'Offline cause');
  });
  testWidgets('Keep draft preserves it; explicit discard removes it',
      (tester) async {
    await mount(tester);
    await start(tester);
    final root = find.byKey(const ValueKey('root_cause'));
    await reveal(tester, root);
    await tester.enterText(root, 'Giữ bản nháp');
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Quay lại'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Giữ bản nháp và quay lại'));
    await tester.pumpAndSettle();
    expect(repo.drafts, isNotEmpty);
    final first = (await repo.assigned(technician.id)).items.first;
    await tester.tap(find.byKey(ValueKey('order_${first.id}')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Quay lại'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bỏ thay đổi'));
    await tester.pumpAndSettle();
    expect(repo.drafts, isEmpty);
  });
  testWidgets('Save failure is visible and cannot claim the draft is stored',
      (tester) async {
    await mount(tester);
    await start(tester);
    repo.failSave = true;
    final root = find.byKey(const ValueKey('root_cause'));
    await reveal(tester, root);
    await tester.enterText(root, 'Chưa lưu được');
    await tester.pumpAndSettle();
    await reveal(tester, find.textContaining('Chưa lưu được bản nháp'));
    expect(find.text('Bản nháp đã lưu trên máy.'), findsNothing);
    expect(repo.drafts, isEmpty);
  });
  testWidgets(
      'Cached refresh cannot clear an uncertain material submission guard',
      (tester) async {
    final first = (await repo.assigned(technician.id)).items.first;
    await repo.start(first, technician.id);
    repo.drafts['${technician.id}:${first.id}'] = const SavedWorkDraft(
        report: CompletionDraft(rootCause: 'Mòn', solution: 'Thay'),
        material: MaterialDraft(parts: [PartSelection(fixturePart, 2)]),
        reviewRequired: true);
    repo.cachedReads = true;
    await mount(tester);
    await tester.tap(find.byTooltip('Cập nhật công việc'));
    await tester.pumpAndSettle();
    final review = find.widgetWithText(
        TextButton, 'Đã kiểm tra yêu cầu, bắt đầu bản nháp mới');
    await reveal(tester, review);
    expect(tester.widget<TextButton>(review).onPressed, isNull);
    repo.cachedReads = false;
    await tester.tap(find.byTooltip('Cập nhật công việc'));
    await tester.pumpAndSettle();
    await reveal(tester, review);
    expect(tester.widget<TextButton>(review).onPressed, isNotNull);
  });
  testWidgets(
      'Uncertain material submission guard survives restoring its draft',
      (tester) async {
    final first = (await repo.assigned(technician.id)).items.first;
    await repo.start(first, technician.id);
    repo.drafts['${technician.id}:${first.id}'] = const SavedWorkDraft(
        report: CompletionDraft(rootCause: 'Mòn', solution: 'Thay'),
        material: MaterialDraft(parts: [PartSelection(fixturePart, 2)]),
        reviewRequired: true);
    await mount(tester);
    final send = find.widgetWithText(FilledButton, 'Gửi yêu cầu vật tư');
    await reveal(tester, send);
    expect(tester.widget<FilledButton>(send).onPressed, isNull);
    expect(repo.materialCreates, 0);
  });
}
