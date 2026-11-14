import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required http.Client client,
    this.timeout = const Duration(seconds: 15),
  }) : _client = client;

  final Uri baseUrl;
  final http.Client _client;
  final Duration timeout;

  Future<Object?> get(String path,
          {String? token, Map<String, String>? query}) =>
      _request('GET', path, token: token, query: query);

  Future<Object?> patch(String path, Map<String, Object?> body,
          {String? token}) =>
      _request('PATCH', path, body: body, token: token);

  Future<Object?> post(String path, Map<String, Object?> body) =>
      _request('POST', path, body: body);

  Future<Object?> _request(
    String method,
    String path, {
    String? token,
    Map<String, Object?>? body,
    Map<String, String>? query,
  }) async {
    final basePath = baseUrl.path.replaceFirst(RegExp(r'/+$'), '');
    final uri = baseUrl.replace(
        path: '$basePath/$path',
        queryParameters: query ?? const {},
        fragment: '');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    late http.Response response;
    try {
      response = await (switch (method) {
        'GET' => _client.get(uri, headers: headers),
        'PATCH' => _client.patch(uri, headers: headers, body: jsonEncode(body)),
        _ => _client.post(uri, headers: headers, body: jsonEncode(body)),
      })
          .timeout(timeout);
    } on TimeoutException {
      throw const ApiException('Máy chủ phản hồi chậm. Vui lòng thử lại.');
    } on http.ClientException {
      throw const ApiException(
          'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    }

    Object? decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      if (response.statusCode == 401) {
        throw const ApiException(
            'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
            statusCode: 401);
      }
      throw ApiException('Máy chủ trả về dữ liệu không hợp lệ.',
          statusCode: response.statusCode);
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map ? decoded['message'] : null;
      throw ApiException(_errorMessage(response.statusCode, message),
          statusCode: response.statusCode);
    }
    if (decoded is! Map<String, dynamic> || decoded['success'] != true) {
      throw const ApiException('Máy chủ trả về dữ liệu không hợp lệ.');
    }
    return decoded['data'];
  }

  String _errorMessage(int statusCode, Object? message) {
    if (statusCode == 401) {
      return message == 'User account has been deactivated'
          ? 'Tài khoản đã bị khóa. Vui lòng liên hệ quản lý.'
          : 'Thông tin đăng nhập không đúng hoặc phiên đăng nhập đã hết hạn.';
    }
    if (statusCode == 403) {
      return 'Tài khoản không có quyền thực hiện thao tác.';
    }
    if (statusCode == 400) {
      return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
    }
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  }

  void close() => _client.close();
}
