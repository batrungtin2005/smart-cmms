class AuthUser {
  const AuthUser({
    required this.id,
    required this.username,
    required this.fullName,
    required this.email,
    required this.role,
    required this.isActive,
  });

  final String id;
  final String username;
  final String fullName;
  final String email;
  final String role;
  final bool isActive;
}
