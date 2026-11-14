import 'package:flutter/foundation.dart';

class ApiConfig {
  static Uri get baseUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    final fallback = !kIsWeb && defaultTargetPlatform == TargetPlatform.android
        ? 'http://10.0.2.2:3000/api/v1'
        : 'http://localhost:3000/api/v1';
    final uri = Uri.parse(configured.isEmpty ? fallback : configured);
    if (!uri.hasAuthority || !['http', 'https'].contains(uri.scheme)) {
      throw const FormatException('API_BASE_URL must be an HTTP(S) URL.');
    }
    return uri;
  }
}
