import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'app.dart';
import 'core/config/api_config.dart';
import 'core/network/api_client.dart';
import 'core/local/local_store.dart';
import 'core/network/connection_monitor.dart';
import 'features/assets/data/asset_repository_impl.dart';
import 'features/assets/data/offline_asset_repository.dart';
import 'features/auth/data/auth_remote_data_source.dart';
import 'features/auth/data/auth_repository_impl.dart';
import 'features/auth/data/token_store.dart';
import 'features/auth/data/session_store.dart';
import 'features/work_orders/data/api_work_order_repository.dart';
import 'features/work_orders/data/demo_work_order_repository.dart';
import 'features/work_orders/data/offline_work_order_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient(baseUrl: ApiConfig.baseUrl, client: http.Client());
  final tokens = SecureTokenStore();
  final mobile = !kIsWeb &&
      [TargetPlatform.android, TargetPlatform.iOS]
          .contains(defaultTargetPlatform);
  final connection = ConnectionMonitor();
  if (mobile) await connection.start();
  final store = mobile ? LocalStore(scope: ApiConfig.baseUrl.toString()) : null;
  final sessions =
      mobile ? SecureSessionStore(scope: ApiConfig.baseUrl.toString()) : null;
  final lease = sessions == null ? null : SessionLease(tokens, sessions);
  final assets = AssetRepositoryImpl(api: api, tokens: tokens);
  final workOrders = ApiWorkOrderRepository(api: api, tokens: tokens);
  runApp(SmartCmmsApp(
    authRepository: AuthRepositoryImpl(
      remote: AuthRemoteDataSource(api),
      tokens: tokens,
      sessions: sessions,
      connection: mobile ? connection : null,
    ),
    assetRepository: store == null
        ? assets
        : OfflineAssetRepository(
            remote: assets,
            store: store,
            connection: connection,
            currentUserId: () async => (await lease!.currentUser()).id),
    workOrderRepository: const bool.fromEnvironment('WORK_ORDERS_DEMO')
        ? DemoWorkOrderRepository()
        : store == null
            ? workOrders
            : OfflineWorkOrderRepository(
                remote: workOrders,
                store: store,
                connection: connection,
                checkAccess: lease!.check),
    onDispose: () {
      api.close();
      unawaited(connection.close());
      if (store != null) unawaited(store.close());
    },
  ));
}
