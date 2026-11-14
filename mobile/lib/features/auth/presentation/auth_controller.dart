import 'package:flutter/foundation.dart';

import '../../../core/network/api_client.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';

enum AuthStatus { restoring, signedOut, signedIn, unavailable }

class AuthController extends ChangeNotifier {
  AuthController(this._repository);

  final AuthRepository _repository;
  AuthStatus status = AuthStatus.restoring;
  AuthUser? user;
  String? errorMessage;
  bool busy = false;
  bool _disposed = false;

  Future<void> restoreSession() async {
    if (busy || _disposed) return;
    busy = true;
    status = AuthStatus.restoring;
    errorMessage = null;
    _notify();
    try {
      final restored = await _repository.restoreSession();
      if (_disposed) return;
      user = restored;
      status = restored == null ? AuthStatus.signedOut : AuthStatus.signedIn;
    } catch (error) {
      if (_disposed) return;
      status = AuthStatus.unavailable;
      errorMessage = _message(
          error, 'Không thể khôi phục phiên đăng nhập. Vui lòng thử lại.');
    } finally {
      busy = false;
      _notify();
    }
  }

  Future<void> signIn(String username, String password) async {
    if (busy || _disposed || status != AuthStatus.signedOut) return;
    busy = true;
    errorMessage = null;
    _notify();
    try {
      final authenticated = await _repository.signIn(username, password);
      if (_disposed) return;
      user = authenticated;
      status = AuthStatus.signedIn;
    } catch (error) {
      if (_disposed) return;
      errorMessage = _message(
          error, 'Không thể lưu phiên đăng nhập an toàn. Vui lòng thử lại.');
    } finally {
      busy = false;
      _notify();
    }
  }

  Future<void> signOut() async {
    if (busy || _disposed) return;
    busy = true;
    errorMessage = null;
    _notify();
    try {
      await _repository.signOut();
      if (_disposed) return;
      user = null;
      status = AuthStatus.signedOut;
    } catch (_) {
      if (_disposed) return;
      errorMessage = 'Chưa xóa được phiên đăng nhập. Vui lòng thử lại.';
    } finally {
      busy = false;
      _notify();
    }
  }

  String _message(Object error, String fallback) =>
      error is ApiException ? error.message : fallback;

  void clearError() {
    if (errorMessage == null) return;
    errorMessage = null;
    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
