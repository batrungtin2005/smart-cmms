import '../../../core/network/api_client.dart';
import '../domain/auth_user.dart';

class LoginResult {
  const LoginResult(this.token, this.user);

  final String token;
  final AuthUser user;
}

class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._api);

  final ApiClient _api;

  Future<LoginResult> signIn(String username, String password) async {
    final data = await _api.post('auth/login', {
      'username': username.trim(),
      'password': password,
    });
    if (data is! Map<String, dynamic> ||
        data['accessToken'] is! String ||
        (data['accessToken'] as String).isEmpty ||
        data['tokenType'] != 'Bearer') {
      throw const ApiException('Dữ liệu đăng nhập từ máy chủ không hợp lệ.');
    }
    return LoginResult(data['accessToken'] as String, _parseUser(data['user']));
  }

  Future<AuthUser> getProfile(String token) async =>
      _parseUser(await _api.get('auth/me', token: token));

  AuthUser _parseUser(Object? data) {
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Thông tin tài khoản từ máy chủ không hợp lệ.');
    }
    final role = data['role'];
    if (data['id'] is! String ||
        (data['id'] as String).isEmpty ||
        data['username'] is! String ||
        data['fullName'] is! String ||
        data['email'] is! String ||
        data['isActive'] is! bool ||
        role is! Map<String, dynamic> ||
        role['name'] is! String) {
      throw const ApiException('Thông tin tài khoản từ máy chủ không hợp lệ.');
    }
    return AuthUser(
      id: data['id'] as String,
      username: data['username'] as String,
      fullName: data['fullName'] as String,
      email: data['email'] as String,
      role: role['name'] as String,
      isActive: data['isActive'] as bool,
    );
  }
}
