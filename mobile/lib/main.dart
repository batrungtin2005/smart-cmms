import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'app.dart';
import 'core/config/api_config.dart';
import 'core/network/api_client.dart';
import 'features/assets/data/asset_repository_impl.dart';
import 'features/auth/data/auth_remote_data_source.dart';
import 'features/auth/data/auth_repository_impl.dart';
import 'features/auth/data/token_store.dart';
import 'features/work_orders/data/api_work_order_repository.dart';
import 'features/work_orders/data/demo_work_order_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient(baseUrl: ApiConfig.baseUrl, client: http.Client());
  final tokens = SecureTokenStore();
  runApp(SmartCmmsApp(
    authRepository: AuthRepositoryImpl(
      remote: AuthRemoteDataSource(api),
      tokens: tokens,
    ),
    assetRepository: AssetRepositoryImpl(api: api, tokens: tokens),
    workOrderRepository: const bool.fromEnvironment('WORK_ORDERS_DEMO')
        ? DemoWorkOrderRepository()
        : ApiWorkOrderRepository(api: api, tokens: tokens),
    onDispose: api.close,
  ));
}
