import 'package:flutter/material.dart';

import '../domain/asset_repository.dart';
import 'asset_details_view.dart';
import 'asset_lookup_controller.dart';
import 'qr_camera_view.dart';

class AssetLookupPage extends StatefulWidget {
  const AssetLookupPage(
      {super.key,
      required this.repository,
      required this.onClose,
      required this.onSessionExpired,
      this.cameraBuilder});

  final AssetRepository repository;
  final VoidCallback onClose;
  final Future<void> Function() onSessionExpired;
  final QrCameraBuilder? cameraBuilder;

  @override
  State<AssetLookupPage> createState() => _AssetLookupPageState();
}

class _AssetLookupPageState extends State<AssetLookupPage> {
  late final AssetLookupController _lookup;
  final _code = TextEditingController();
  bool _manual = false;
  int _cameraGeneration = 0;

  @override
  void initState() {
    super.initState();
    _lookup = AssetLookupController(widget.repository);
  }

  @override
  void dispose() {
    _lookup.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit(String raw) async {
    if (_lookup.busy || _lookup.asset != null || _lookup.error != null) return;
    FocusScope.of(context).unfocus();
    await _lookup.lookup(raw);
    if (mounted && _lookup.sessionExpired) await widget.onSessionExpired();
  }

  void _reset() {
    _code.clear();
    _lookup.reset();
  }

  void _back() {
    if (_lookup.asset != null) {
      _reset();
    } else {
      widget.onClose();
    }
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _lookup,
        builder: (context, _) => PopScope(
          canPop: false,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop) _back();
          },
          child: Scaffold(
            appBar: AppBar(
              title: Text(_lookup.asset == null
                  ? 'Quét mã tài sản'
                  : 'Chi tiết tài sản'),
              leading: IconButton(
                  tooltip: 'Quay lại',
                  onPressed: _back,
                  icon: const Icon(Icons.arrow_back)),
              actions: [
                if (_lookup.asset != null)
                  IconButton(
                      tooltip: 'Về trang chính',
                      onPressed: widget.onClose,
                      icon: const Icon(Icons.home_outlined))
              ],
            ),
            body: _lookup.asset != null
                ? AssetDetailsView(asset: _lookup.asset!, onScanAgain: _reset)
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                            _manual
                                ? 'Nhập mã trên tem thiết bị'
                                : 'Đưa mã QR vào khung hình',
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        if (_manual) ...[
                          TextField(
                            key: const ValueKey('asset_code'),
                            controller: _code,
                            enabled: !_lookup.busy,
                            autocorrect: false,
                            textCapitalization: TextCapitalization.characters,
                            textInputAction: TextInputAction.search,
                            maxLength: 50,
                            onChanged: (_) {
                              if (_lookup.error != null) _lookup.reset();
                            },
                            onSubmitted: _submit,
                            decoration: const InputDecoration(
                                labelText: 'Mã tài sản',
                                hintText: 'AST-001',
                                border: OutlineInputBorder()),
                          ),
                          FilledButton(
                              onPressed: _lookup.busy
                                  ? null
                                  : () => _submit(_code.text),
                              child: const Text('Tra cứu')),
                        ] else if (!_lookup.busy && _lookup.error == null)
                          SizedBox(
                              height: 290,
                              child: widget.cameraBuilder
                                      ?.call(context, _submit) ??
                                  QrCameraView(
                                    key: ValueKey(_cameraGeneration),
                                    onCode: _submit,
                                    onRetry: () =>
                                        setState(() => _cameraGeneration++),
                                  )),
                        if (_lookup.busy)
                          const Padding(
                            padding: EdgeInsets.all(28),
                            child: Column(children: [
                              CircularProgressIndicator(),
                              SizedBox(height: 16),
                              Text('Đang tra cứu thiết bị…'),
                            ]),
                          ),
                        if (_lookup.error != null)
                          Card(
                              child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(children: [
                              const Icon(Icons.info_outline),
                              const SizedBox(height: 8),
                              Text(_lookup.error!,
                                  key: const ValueKey('asset_error'),
                                  textAlign: TextAlign.center),
                              TextButton(
                                  onPressed: _lookup.reset,
                                  child:
                                      Text(_manual ? 'Thử lại' : 'Quét lại')),
                            ]),
                          )),
                        const SizedBox(height: 12),
                        TextButton.icon(
                          onPressed: _lookup.busy
                              ? null
                              : () {
                                  _lookup.reset();
                                  setState(() => _manual = !_manual);
                                },
                          icon: Icon(_manual
                              ? Icons.qr_code_scanner
                              : Icons.keyboard_outlined),
                          label: Text(_manual
                              ? 'Quét bằng camera'
                              : 'Nhập mã thủ công'),
                        ),
                      ],
                    )),
          ),
        ),
      );
}
