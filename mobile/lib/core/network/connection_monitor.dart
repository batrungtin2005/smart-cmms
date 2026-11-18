import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/widgets.dart';

/// A network interface is only a hint; reads still handle transport failures.
class ConnectionMonitor with WidgetsBindingObserver {
  ConnectionMonitor({bool offline = false}) : _offline = offline;
  bool _offline;
  bool get offline => _offline;
  final _events = StreamController<void>.broadcast();
  Stream<void> get changes => _events.stream;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _observing = false;

  void setOffline(bool value) {
    if (value == _offline) return;
    _offline = value;
    if (!_events.isClosed) _events.add(null);
  }

  Future<void> start() async {
    if (_observing) return;
    WidgetsBinding.instance.addObserver(this);
    _observing = true;
    _subscription = Connectivity()
        .onConnectivityChanged
        .listen(_update, onError: (Object _) {});
    await recheck();
  }

  void _update(List<ConnectivityResult> values) => setOffline(
      values.isNotEmpty && values.every((v) => v == ConnectivityResult.none));

  Future<void> recheck() async {
    try {
      _update(await Connectivity().checkConnectivity());
    } catch (_) {
      // Keep the previous state; HTTP still decides whether a read succeeded.
    }
  }

  Future<void> close() async {
    if (_observing) WidgetsBinding.instance.removeObserver(this);
    _observing = false;
    await _subscription?.cancel();
    await _events.close();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(recheck());
  }
}
