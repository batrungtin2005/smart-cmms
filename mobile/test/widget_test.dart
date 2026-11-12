import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_cmms_mobile/app.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/features/auth/domain/auth_user.dart';
import 'package:smart_cmms_mobile/features/home/presentation/technician_home_page.dart';

import 'support/auth_fixtures.dart';
import 'support/asset_fixtures.dart';
import 'support/work_order_fixtures.dart';

void main() {
  late FakeAuthRepository repo;
  setUp(() => repo = FakeAuthRepository());

  Future<void> openApp(WidgetTester tester) async {
    await tester.pumpWidget(SmartCmmsApp(
        authRepository: repo,
        assetRepository: FakeAssetRepository(),
        workOrderRepository: FakeWorkOrderRepository()));
    await tester.pumpAndSettle();
  }

  Future<void> fillLogin(WidgetTester tester) async {
    await tester.enterText(
        find.byKey(const ValueKey('username')), 'tech@example.com');
    await tester.enterText(
        find.byKey(const ValueKey('password')), 'Password@123');
  }

  testWidgets('Starts on login with the password hidden', (tester) async {
    await openApp(tester);
    expect(find.text('Smart CMMS'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.byType(TechnicianHomePage), findsNothing);
    expect(tester.widget<TextField>(find.byType(TextField).last).obscureText,
        isTrue);
  });

  testWidgets('Empty form is rejected without contacting the repository',
      (tester) async {
    await openApp(tester);
    await tester.tap(find.text('ĐĂNG NHẬP'));
    await tester.pump();
    expect(find.text('Vui lòng nhập tên đăng nhập hoặc email'), findsOneWidget);
    expect(find.text('Vui lòng nhập mật khẩu'), findsOneWidget);
    expect(repo.signInCalls, 0);
  });

  testWidgets('Short password is rejected without a request', (tester) async {
    await openApp(tester);
    await tester.enterText(find.byKey(const ValueKey('username')), 'tech');
    await tester.enterText(find.byKey(const ValueKey('password')), '12345');
    await tester.tap(find.text('ĐĂNG NHẬP'));
    await tester.pump();
    expect(find.text('Mật khẩu phải có ít nhất 6 ký tự'), findsOneWidget);
    expect(repo.signInCalls, 0);
  });

  testWidgets('Successful login opens the authenticated technician profile',
      (tester) async {
    await openApp(tester);
    await fillLogin(tester);
    await tester.tap(find.text('ĐĂNG NHẬP'));
    await tester.pumpAndSettle();
    expect(find.byType(TechnicianHomePage), findsOneWidget);
    expect(find.text('Xin chào, ${technician.fullName}'), findsOneWidget);
    expect(find.text(technician.email), findsOneWidget);
  });

  testWidgets('Rejected credentials show an error and keep the user on login',
      (tester) async {
    repo.signInError =
        const ApiException('Sai thông tin đăng nhập.', statusCode: 401);
    await openApp(tester);
    await fillLogin(tester);
    await tester.tap(find.text('ĐĂNG NHẬP'));
    await tester.pumpAndSettle();
    expect(find.text('Sai thông tin đăng nhập.'), findsOneWidget);
    expect(find.byType(TechnicianHomePage), findsNothing);
    expect(tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
        isNotNull);
  });

  testWidgets('Repeated submission sends only one request', (tester) async {
    final pending = Completer<AuthUser>();
    repo.pendingSignIn = pending.future;
    await openApp(tester);
    await fillLogin(tester);
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();
    expect(repo.signInCalls, 1);
    expect(tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
        isNull);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(repo.signInCalls, 1);
    pending.complete(technician);
    await tester.pumpAndSettle();
    expect(find.byType(TechnicianHomePage), findsOneWidget);
  });

  testWidgets(
      'Leaving the app while login is pending does not notify disposed widgets',
      (tester) async {
    final pending = Completer<AuthUser>();
    repo.pendingSignIn = pending.future;
    await openApp(tester);
    await fillLogin(tester);
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    pending.complete(technician);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('Restored session opens home without showing login',
      (tester) async {
    repo.restoredUser = technician;
    await openApp(tester);
    expect(find.byType(TechnicianHomePage), findsOneWidget);
    expect(find.byType(TextFormField), findsNothing);
  });

  testWidgets(
      'Restore network failure offers retry instead of discarding the session',
      (tester) async {
    repo.restoreError = const ApiException('Không kết nối được máy chủ.');
    await openApp(tester);
    expect(find.text('Thử lại'), findsOneWidget);
    expect(find.byType(TextFormField), findsNothing);
    repo.restoreError = null;
    repo.restoredUser = technician;
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.byType(TechnicianHomePage), findsOneWidget);
  });

  testWidgets('Logout returns to an empty login and back cannot restore home',
      (tester) async {
    repo.restoredUser = technician;
    await openApp(tester);
    await tester.tap(find.byTooltip('Đăng xuất'));
    await tester.pumpAndSettle();
    expect(repo.signOutCalls, 1);
    expect(find.byType(TechnicianHomePage), findsNothing);
    expect(find.text('ĐĂNG NHẬP'), findsOneWidget);
    expect(
        tester.widget<TextField>(find.byType(TextField).last).controller!.text,
        isEmpty);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.byType(TechnicianHomePage), findsNothing);
  });

  testWidgets('Failed durable logout keeps home and reports the error',
      (tester) async {
    repo.restoredUser = technician;
    repo.signOutError = StateError('Storage unavailable');
    await openApp(tester);
    await tester.tap(find.byTooltip('Đăng xuất'));
    await tester.pumpAndSettle();
    expect(find.byType(TechnicianHomePage), findsOneWidget);
    expect(find.text('Chưa xóa được phiên đăng nhập. Vui lòng thử lại.'),
        findsOneWidget);
  });
}
