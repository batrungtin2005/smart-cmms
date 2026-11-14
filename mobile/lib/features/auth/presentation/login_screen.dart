import 'package:flutter/material.dart';

import 'auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.controller});

  final AuthController controller;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (!widget.controller.busy && _formKey.currentState!.validate()) {
      widget.controller.signIn(_username.text.trim(), _password.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = widget.controller;
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: AutofillGroup(
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.build_circle_outlined,
                        size: 80, color: Colors.blue),
                    const SizedBox(height: 16),
                    const Text('Smart CMMS',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 28, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text('Ứng dụng Kỹ thuật viên hiện trường',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.grey)),
                    const SizedBox(height: 32),
                    TextFormField(
                      key: const ValueKey('username'),
                      controller: _username,
                      enabled: !auth.busy,
                      autofillHints: const [AutofillHints.username],
                      autocorrect: false,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => auth.clearError(),
                      decoration: InputDecoration(
                        labelText: 'Tên đăng nhập hoặc email',
                        prefixIcon: const Icon(Icons.person_outline),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                              ? 'Vui lòng nhập tên đăng nhập hoặc email'
                              : null,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      key: const ValueKey('password'),
                      controller: _password,
                      enabled: !auth.busy,
                      obscureText: _obscurePassword,
                      autofillHints: const [AutofillHints.password],
                      enableSuggestions: false,
                      autocorrect: false,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      onChanged: (_) => auth.clearError(),
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Hiện mật khẩu'
                              : 'Ẩn mật khẩu',
                          onPressed: auth.busy
                              ? null
                              : () => setState(
                                  () => _obscurePassword = !_obscurePassword),
                          icon: Icon(_obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined),
                        ),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập mật khẩu';
                        }
                        if (value.length < 6) {
                          return 'Mật khẩu phải có ít nhất 6 ký tự';
                        }
                        return null;
                      },
                    ),
                    if (auth.errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Text(auth.errorMessage!,
                          key: const ValueKey('auth_error'),
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: auth.busy ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: auth.busy
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Text('ĐĂNG NHẬP',
                                style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
