import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

typedef QrCameraBuilder = Widget Function(
    BuildContext context, ValueChanged<String> onCode);

class QrCameraView extends StatefulWidget {
  const QrCameraView({super.key, required this.onCode, required this.onRetry});

  final ValueChanged<String> onCode;
  final VoidCallback onRetry;

  @override
  State<QrCameraView> createState() => _QrCameraViewState();
}

class _QrCameraViewState extends State<QrCameraView>
    with WidgetsBindingObserver {
  // MobileScanner uses one platform camera. A new view must wait for its predecessor.
  static Future<void>? _released;
  late final MobileScannerController _camera;
  late Future<void> _operation;
  StreamSubscription<BarcodeCapture>? _subscription;
  bool _foreground = true;
  bool _disposed = false;
  bool _unexpectedError = false;

  @override
  void initState() {
    super.initState();
    _operation = _released ?? Future<void>.value();
    _camera = MobileScannerController(
      autoStart: false,
      formats: const [BarcodeFormat.qrCode],
      detectionSpeed: DetectionSpeed.normal,
      detectionTimeoutMs: 500,
    );
    _subscription = _camera.barcodes.listen((capture) {
      if (_disposed || !_foreground) return;
      for (final barcode in capture.barcodes) {
        final raw = barcode.rawValue;
        if (raw != null && raw.trim().isNotEmpty) {
          widget.onCode(raw);
          break;
        }
      }
    });
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _synchronize());
  }

  void _synchronize() {
    if (_disposed) return;
    _operation = _operation.then((_) async {
      if (_disposed) return;
      if (!_foreground) {
        await _camera.stop();
        return;
      }
      // Permission failures need an explicit retry, not repeated permission requests.
      if (_camera.value.error == null) await _camera.start();
      if (_disposed || !_foreground) await _camera.stop();
    }).catchError((Object _) {
      if (mounted) setState(() => _unexpectedError = true);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    // A permission dialog can change lifecycle before camera initialization finishes.
    if (_camera.value.isInitialized) _synchronize();
  }

  @override
  void dispose() {
    _disposed = true;
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_subscription?.cancel());
    final release =
        _operation.then((_) => _camera.dispose()).catchError((Object _) {});
    _released = release;
    unawaited(release.whenComplete(() {
      if (identical(_released, release)) _released = null;
    }));
    super.dispose();
  }

  Widget _failure({required bool permissionDenied}) => CameraFailureView(
        permissionDenied: permissionDenied,
        onRetry: widget.onRetry,
      );

  @override
  Widget build(BuildContext context) {
    if (_unexpectedError) return _failure(permissionDenied: false);
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: MobileScanner(
        controller: _camera,
        errorBuilder: (context, error, child) => _failure(
          permissionDenied:
              error.errorCode == MobileScannerErrorCode.permissionDenied,
        ),
        overlayBuilder: (context, constraints) => IgnorePointer(
          child: Center(
              child: Container(
            width: 190,
            height: 190,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 3),
              borderRadius: BorderRadius.circular(16),
            ),
          )),
        ),
      ),
    );
  }
}

class CameraFailureView extends StatelessWidget {
  const CameraFailureView(
      {super.key, required this.permissionDenied, required this.onRetry});

  final bool permissionDenied;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Center(
            child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.no_photography_outlined, size: 36),
            const SizedBox(height: 12),
            Text(
                permissionDenied
                    ? 'Chưa có quyền sử dụng camera'
                    : 'Không mở được camera',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
                permissionDenied
                    ? 'Cho phép Camera trong cài đặt quyền của ứng dụng, rồi thử lại. Bạn cũng có thể nhập mã thủ công.'
                    : 'Hãy kiểm tra camera hoặc dùng cách nhập mã thủ công.',
                textAlign: TextAlign.center),
            TextButton(onPressed: onRetry, child: const Text('Thử lại camera')),
          ]),
        )),
      );
}
