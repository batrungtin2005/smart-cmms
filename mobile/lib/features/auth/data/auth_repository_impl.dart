import '../../../core/network/api_client.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';
import 'auth_remote_data_source.dart';
import 'token_store.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({required this.remote, required this.tokens});

  final AuthRemoteDataSource remote;
  final TokenStore tokens;

  @override
  Future<AuthUser> signIn(String username, String password) async {
    final result = await remote.signIn(username, password);
    _checkTechnician(result.user);
    await tokens.write(result.token);
    return result.user;
  }

  @override
  Future<AuthUser?> restoreSession() async {
    final token = await tokens.read();
    if (token == null || token.isEmpty) return null;
    try {
      final user = await remote.getProfile(token);
      _checkTechnician(user);
      return user;
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        await tokens.delete();
        return null;
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
  Future<void> signOut() => tokens.delete();
}
