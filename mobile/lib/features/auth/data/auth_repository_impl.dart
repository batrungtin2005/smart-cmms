import '../../../core/network/api_client.dart';
import '../../../core/network/connection_monitor.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';
import 'auth_remote_data_source.dart';
import 'token_store.dart';
import 'session_store.dart';

class AuthRepositoryImpl implements AuthRepository, OfflineSessionAuth {
  AuthRepositoryImpl(
      {required this.remote,
      required this.tokens,
      this.sessions,
      this.connection});

  final AuthRemoteDataSource remote;
  final TokenStore tokens;
  final SessionStore? sessions;
  final ConnectionMonitor? connection;
  @override
  bool restoredOffline = false;

  @override
  Future<AuthUser> signIn(String username, String password) async {
    final result = await remote.signIn(username, password);
    _checkTechnician(result.user);
    await tokens.write(result.token);
    try {
      await sessions?.write(SessionSnapshot(result.token, result.user));
    } catch (_) {
      await tokens.delete();
      rethrow;
    }
    restoredOffline = false;
    connection?.setOffline(false);
    return result.user;
  }

  @override
  Future<AuthUser?> restoreSession() async {
    final token = await tokens.read();
    if (token == null || token.isEmpty) return null;
    try {
      if (connection?.offline == true && sessions != null) {
        throw const ApiException('Đang mất kết nối.',
            isConnectionFailure: true);
      }
      final user = await remote.getProfile(token);
      _checkTechnician(user);
      await sessions?.write(SessionSnapshot(token, user));
      restoredOffline = false;
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await signOut();
        return null;
      }
      if (error.isConnectionFailure && sessions != null) {
        final saved = await sessions!.read();
        if (saved != null && saved.token == token) {
          if (!saved.validAt(DateTime.now())) {
            await signOut();
            return null;
          }
          _checkTechnician(saved.user);
          restoredOffline = true;
          connection?.setOffline(true);
          return saved.user;
        }
      }
      // Retain the token on network/server failures so a retry can restore it.
      rethrow;
    }
  }

  void _checkTechnician(AuthUser user) {
    if (!user.isActive || user.role != 'TECHNICIAN') {
      throw const ApiException(
          'Ứng dụng này dành cho tài khoản kỹ thuật viên đang hoạt động.',
          statusCode: 403);
    }
  }

  @override
  Future<void> signOut() async {
    // Delete the offline profile first so a failed token deletion cannot
    // restore offline access. Retrying logout still deletes both keys.
    await sessions?.delete();
    await tokens.delete();
    restoredOffline = false;
  }
}
