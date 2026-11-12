import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_cmms_mobile/app.dart';
import 'package:smart_cmms_mobile/core/network/api_client.dart';
import 'package:smart_cmms_mobile/features/assets/domain/asset_details.dart';
import 'package:smart_cmms_mobile/features/assets/presentation/asset_details_view.dart';
import 'package:smart_cmms_mobile/features/assets/presentation/qr_camera_view.dart';

import 'support/asset_fixtures.dart';
import 'support/auth_fixtures.dart';
import 'support/work_order_fixtures.dart';

void main() {
  late FakeAuthRepository auth;
  late FakeAssetRepository assets;
  late ValueChanged<String> scan;
  setUp(() {
    auth = FakeAuthRepository()..restoredUser = technician;
    assets = FakeAssetRepository();
  });
  Future<void> open(WidgetTester tester, {bool denied = false}) async {
    await tester.pumpWidget(SmartCmmsApp(
        authRepository: auth,
        assetRepository: assets,
        workOrderRepository: FakeWorkOrderRepository(),
        cameraBuilder: (context, onCode) {
          scan = onCode;
          return denied
              ? CameraFailureView(permissionDenied: true, onRetry: () {})
              : const ColoredBox(
                  color: Colors.black,
                  child: Center(child: Text('Camera test')));
        }));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Quét mã QR thiết bị'));
    await tester.pumpAndSettle();
  }

  testWidgets('Backend QR opens live detail and suppresses repeated captures',
      (tester) async {
    final pending = Completer<AssetDetails>();
    assets.pending = pending.future;
    await open(tester);
    scan(qrPayload);
    scan(qrPayload);
    await tester.pump();
    expect(assets.calls, 1);
    pending.complete(demoAsset);
    await tester.pumpAndSettle();
    expect(find.text(demoAsset.name), findsOneWidget);
    expect(find.text('Đang hoạt động'), findsOneWidget);
    expect(find.byType(AssetDetailsView), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Camera test'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Xin chào, ${technician.fullName}'), findsOneWidget);
  });
  testWidgets('Invalid scan shows recovery without making a request',
      (tester) async {
    await open(tester);
    scan('unrelated-code');
    await tester.pumpAndSettle();
    expect(assets.calls, 0);
    expect(find.byKey(const ValueKey('asset_error')), findsOneWidget);
    await tester.tap(find.text('Quét lại'));
    await tester.pumpAndSettle();
    expect(find.text('Camera test'), findsOneWidget);
  });
  testWidgets('Camera denial retains a working manual lookup', (tester) async {
    await open(tester, denied: true);
    expect(find.text('Chưa có quyền sử dụng camera'), findsOneWidget);
    await tester.tap(find.text('Nhập mã thủ công'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('asset_code')), 'ast-001');
    await tester.tap(find.text('Tra cứu'));
    await tester.pumpAndSettle();
    expect(assets.lastIdentifier?.code, 'AST-001');
    expect(find.text(demoAsset.name), findsOneWidget);
  });
  testWidgets('Not found and connection errors can be corrected and retried',
      (tester) async {
    assets.error =
        const ApiException('Không tìm thấy tài sản AST-404.', statusCode: 404);
    await open(tester);
    await tester.tap(find.text('Nhập mã thủ công'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('asset_code')), 'AST-404');
    await tester.tap(find.text('Tra cứu'));
    await tester.pumpAndSettle();
    expect(find.text('Không tìm thấy tài sản AST-404.'), findsOneWidget);
    assets.error = const ApiException('Không kết nối được máy chủ.');
    await tester.enterText(find.byKey(const ValueKey('asset_code')), 'AST-001');
    await tester.tap(find.text('Tra cứu'));
    await tester.pumpAndSettle();
    expect(find.text('Không kết nối được máy chủ.'), findsOneWidget);
    assets.error = null;
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tra cứu'));
    await tester.pumpAndSettle();
    expect(find.text(demoAsset.name), findsOneWidget);
  });
  testWidgets(
      'Expired session removes scanner and protected content before login',
      (tester) async {
    assets.error = const ApiException('Expired', statusCode: 401);
    await open(tester);
    scan('AST-001');
    await tester.pumpAndSettle();
    expect(auth.signOutCalls, 1);
    expect(find.text('ĐĂNG NHẬP'), findsOneWidget);
    expect(find.text('Camera test'), findsNothing);
    expect(find.byType(AssetDetailsView), findsNothing);
  });
}
