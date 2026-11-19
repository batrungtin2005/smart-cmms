import 'auth_user.dart';

abstract interface class OfflineSessionAuth {
  bool get restoredOffline;
}

abstract interface class AuthRepository {
  Future<AuthUser?> restoreSession();
  Future<AuthUser> signIn(String username, String password);
  Future<void> signOut();
}
