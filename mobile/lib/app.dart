import 'dart:async';

import 'package:flutter/material.dart';

import 'features/assets/domain/asset_repository.dart';
import 'features/assets/presentation/qr_camera_view.dart';
import 'features/auth/domain/auth_repository.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/home/presentation/technician_home_page.dart';
import 'features/work_orders/domain/work_order_repository.dart';

class SmartCmmsApp extends StatefulWidget {
  const SmartCmmsApp(
      {super.key,
      required this.authRepository,
      required this.assetRepository,
      required this.workOrderRepository,
      this.cameraBuilder,
      this.onDispose});

  final AuthRepository authRepository;
  final AssetRepository assetRepository;
  final WorkOrderRepository workOrderRepository;
  final QrCameraBuilder? cameraBuilder;
  final VoidCallback? onDispose;

  @override
  State<SmartCmmsApp> createState() => _SmartCmmsAppState();
}

class _SmartCmmsAppState extends State<SmartCmmsApp> {
  late final AuthController _auth;

  @override
  void initState() {
    super.initState();
    _auth = AuthController(widget.authRepository);
    unawaited(_auth.restoreSession());
  }

  @override
  void dispose() {
    _auth.dispose();
    widget.onDispose?.call();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Smart CMMS - Kỹ thuật viên',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
          useMaterial3: true,
        ),
        home: AnimatedBuilder(
          animation: _auth,
          builder: (context, _) => switch (_auth.status) {
            AuthStatus.restoring => const Scaffold(
                body: Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Đang kiểm tra phiên đăng nhập…'),
                ])),
              ),
            AuthStatus.signedOut => LoginScreen(controller: _auth),
            AuthStatus.signedIn => TechnicianHomePage(
                controller: _auth,
                assetRepository: widget.assetRepository,
                workOrderRepository: widget.workOrderRepository,
                cameraBuilder: widget.cameraBuilder),
            AuthStatus.unavailable => Scaffold(
                body: Center(
                    child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.cloud_off, size: 48),
                    const SizedBox(height: 16),
                    Text(_auth.errorMessage!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                        onPressed: _auth.restoreSession,
                        child: const Text('Thử lại')),
                    TextButton(
                        onPressed: _auth.signOut,
                        child: const Text('Đăng nhập tài khoản khác')),
                  ]),
                )),
              ),
          },
        ),
      );
}
