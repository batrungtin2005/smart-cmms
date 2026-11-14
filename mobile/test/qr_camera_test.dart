import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
// The pinned plugin exposes these types in its platform interface, but not its barrel.
// ignore: implementation_imports
import 'package:mobile_scanner/src/mobile_scanner_view_attributes.dart';
// ignore: implementation_imports
import 'package:mobile_scanner/src/objects/start_options.dart';
import 'package:smart_cmms_mobile/features/assets/presentation/qr_camera_view.dart';

class TestCameraPlatform extends MobileScannerPlatform {
  int starts = 0;
  int stops = 0;
  int disposals = 0;
  bool deny = false;
  final captures = StreamController<BarcodeCapture?>.broadcast();

  @override
  Stream<BarcodeCapture?> get barcodesStream => captures.stream;
  @override
  Stream<TorchState> get torchStateStream => const Stream.empty();
  @override
  Stream<double> get zoomScaleStateStream => const Stream.empty();
  @override
  Widget buildCameraView() => const SizedBox.expand();
  @override
  Future<MobileScannerViewAttributes> start(StartOptions options) async {
    starts++;
    expect(options.formats, [BarcodeFormat.qrCode]);
    if (deny) {
      throw const MobileScannerException(
          errorCode: MobileScannerErrorCode.permissionDenied);
    }
    return const MobileScannerViewAttributes(
        currentTorchMode: TorchState.unavailable,
        numberOfCameras: 1,
        size: Size(640, 480));
  }

  @override
  Future<void> stop() async {
    stops++;
  }

  @override
  Future<void> dispose() async {
    disposals++;
  }

  @override
  Future<void> updateScanWindow(Rect? window) async {}
}

void main() {
  late MobileScannerPlatform original;
  late TestCameraPlatform platform;
  setUp(() {
    original = MobileScannerPlatform.instance;
    platform = TestCameraPlatform();
    MobileScannerPlatform.instance = platform;
  });
  tearDown(() async {
    await platform.captures.close();
    MobileScannerPlatform.instance = original;
  });

  Future<void> open(WidgetTester tester, {ValueChanged<String>? onCode}) async {
    await tester.pumpWidget(MaterialApp(
        home: SizedBox(
            height: 300,
            child: QrCameraView(onCode: onCode ?? (_) {}, onRetry: () {}))));
    await tester.pumpAndSettle();
  }

  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
  }

  testWidgets('Backgrounding stops camera and returning restarts it',
      (tester) async {
    await open(tester);
    expect(platform.starts, 1);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await tester.pumpAndSettle();
    expect(platform.stops, 1);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(platform.starts, 2);
    await close(tester);
    expect(platform.disposals, 1);
  });
  testWidgets(
      'Permission denial shows recovery and does not repeatedly request permission',
      (tester) async {
    platform.deny = true;
    await open(tester);
    expect(find.text('Chưa có quyền sử dụng camera'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(platform.starts, 1);
    await close(tester);
  });
  testWidgets('Unmounting releases camera and prevents later barcode callbacks',
      (tester) async {
    final values = <String>[];
    await open(tester, onCode: values.add);
    platform.captures
        .add(const BarcodeCapture(barcodes: [Barcode(rawValue: 'AST-001')]));
    await tester.pumpAndSettle();
    expect(values, ['AST-001']);
    await close(tester);
    platform.captures
        .add(const BarcodeCapture(barcodes: [Barcode(rawValue: 'AST-002')]));
    await tester.pumpAndSettle();
    expect(values, ['AST-001']);
    expect(platform.disposals, 1);
  });
}
