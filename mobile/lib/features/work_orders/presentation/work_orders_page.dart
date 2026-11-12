import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/network/api_client.dart';
import '../domain/work_order.dart';
import '../domain/work_order_repository.dart';
import 'work_order_controller.dart';
import 'work_order_labels.dart';

class WorkOrdersPage extends StatefulWidget {
  const WorkOrdersPage(
      {super.key,
      required this.repository,
      required this.technicianId,
      required this.onClose,
      required this.onSessionExpired});
  final WorkOrderRepository repository;
  final String technicianId;
  final VoidCallback onClose;
  final Future<void> Function() onSessionExpired;
  @override
  State<WorkOrdersPage> createState() => _WorkOrdersPageState();
}

class _WorkOrdersPageState extends State<WorkOrdersPage> {
  late final WorkOrderController _work;
  final _notes = TextEditingController(),
      _hours = TextEditingController(),
      _search = TextEditingController();
  final _selections = <String, PartSelection>{};
  bool _dirty = false, _review = false, _discard = false, _picking = false;
  String? _formError, _partsError;
  bool _partsLoading = false;
  int _partsGeneration = 0;
  List<StockPart> _parts = [];
  ResultPage<StockPart>? _partsPage;

  @override
  void initState() {
    super.initState();
    _work = WorkOrderController(widget.repository, widget.technicianId);
    unawaited(_guard(_work.load()));
  }

  @override
  void dispose() {
    _work.dispose();
    _notes.dispose();
    _hours.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<T> _guard<T>(Future<T> request) async {
    final result = await request;
    if (mounted && _work.sessionExpired) await widget.onSessionExpired();
    return result;
  }

  void _clearDraft() {
    _notes.clear();
    _hours.clear();
    _selections.clear();
    _dirty = false;
    _review = false;
    _discard = false;
    _picking = false;
    _formError = null;
    _partsGeneration++;
  }

  void _open(WorkOrder order) {
    _clearDraft();
    unawaited(_guard(_work.open(order.id)));
  }

  void _back() {
    if (_work.actionBusy) return;
    if (_discard) {
      setState(() => _discard = false);
      return;
    }
    if (_picking) {
      _partsGeneration++;
      setState(() => _picking = false);
      return;
    }
    if (_review) {
      setState(() => _review = false);
      return;
    }
    if (_work.selectedId != null) {
      if (_dirty) {
        setState(() => _discard = true);
        return;
      }
      _clearDraft();
      _work.close();
    } else {
      widget.onClose();
    }
  }

  void _changed(String _) {
    _dirty = true;
    if (_formError != null) setState(() => _formError = null);
  }

  CompletionDraft _draft() => CompletionDraft(
      notes: _notes.text,
      actualHours: double.tryParse(_hours.text.trim().replaceAll(',', '.')) ??
          double.nan,
      parts: List.unmodifiable(_selections.values));
  void _prepareCompletion() {
    FocusScope.of(context).unfocus();
    try {
      _draft().validate();
      setState(() {
        _review = true;
        _formError = null;
      });
    } on WorkOrderValidation catch (failure) {
      setState(() => _formError = failure.message);
    }
  }

  Future<void> _complete() async {
    final success = await _guard(_work.complete(_draft()));
    if (!mounted) return;
    setState(() {
      _review = false;
      if (success) _dirty = false;
    });
  }

  Future<void> _refreshDetail() async {
    final id = _work.selectedId;
    if (id == null) return;
    await _guard(_work.open(id));
    if (!mounted) return;
    if (_work.selected != null &&
        !_work.selected!.canComplete(widget.technicianId)) {
      setState(() {
        _dirty = false;
        _review = false;
      });
    }
  }

  Future<void> _loadParts({bool more = false}) async {
    if (_work.actionBusy ||
        (more && (_partsLoading || _partsPage?.hasMore != true))) {
      return;
    }
    final generation = ++_partsGeneration;
    final page = more ? _partsPage!.page + 1 : 1;
    setState(() {
      _partsLoading = true;
      _partsError = null;
      if (!more) {
        _parts = [];
        _partsPage = null;
      }
    });
    try {
      final result = await widget.repository
          .parts(widget.technicianId, search: _search.text, page: page);
      if (!mounted || generation != _partsGeneration) return;
      setState(() {
        final merged = {for (final part in _parts) part.id: part};
        for (final part in result.items) {
          merged[part.id] = part;
          final selected = _selections[part.id];
          if (selected != null) {
            _selections[part.id] = PartSelection(part, selected.quantity);
          }
        }
        _parts = merged.values.toList();
        _partsPage = result;
      });
    } catch (failure) {
      if (!mounted || generation != _partsGeneration) return;
      setState(() => _partsError = failure is ApiException
          ? failure.message
          : 'Không tải được danh sách phụ tùng.');
      if (failure is ApiException && failure.statusCode == 401) {
        await widget.onSessionExpired();
      }
    } finally {
      if (mounted && generation == _partsGeneration) {
        setState(() => _partsLoading = false);
      }
    }
  }

  Widget _error(String message, {VoidCallback? retry}) => Card(
          child: Padding(
        padding: const EdgeInsets.all(16),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(message,
              key: const ValueKey('work_error'),
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
          if (retry != null)
            TextButton(onPressed: retry, child: const Text('Tải lại')),
        ]),
      ));
  Widget _row(String title, String value) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Text('$title: $value'));
  Widget _card(String title, List<Widget> children) => Card(
      child: Padding(
          padding: const EdgeInsets.all(16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ...children
          ])));

  Widget _list() => RefreshIndicator(
        onRefresh: () => _guard(_work.load(filter: _work.priority)),
        child: ListView(
            key: const PageStorageKey('work-list'),
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              Wrap(spacing: 8, runSpacing: 4, children: [
                ChoiceChip(
                    label: const Text('Tất cả'),
                    selected: _work.priority == null,
                    onSelected: (_) => _guard(_work.load())),
                for (final priority in WorkOrderPriority.values)
                  ChoiceChip(
                      label: Text(priority.label),
                      selected: _work.priority == priority,
                      onSelected: (_) => _guard(_work.load(filter: priority))),
              ]),
              const SizedBox(height: 12),
              if (_work.listError != null)
                _error(_work.listError!,
                    retry: () => _guard(_work.load(filter: _work.priority))),
              if (!_work.loading &&
                  _work.listError == null &&
                  _work.orders.isEmpty)
                const Padding(
                    padding: EdgeInsets.all(28),
                    child: Text('Chưa có công việc phù hợp với bộ lọc.')),
              for (final order in _work.orders)
                Card(
                    child: ListTile(
                  key: ValueKey('order_${order.id}'),
                  isThreeLine: true,
                  onTap: () => _open(order),
                  leading: Icon(Icons.assignment_outlined,
                      color: order.priority == WorkOrderPriority.critical
                          ? Colors.red
                          : null),
                  title: Text(order.title),
                  subtitle: Text(
                      '${order.code} · ${order.priority.label}\n${order.status.label} · ${order.assetCode}'),
                  trailing: const Icon(Icons.chevron_right),
                )),
              if (_work.loading)
                const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator())),
              if (_work.listPage?.hasMore == true && !_work.loading)
                TextButton(
                    onPressed: () => _guard(_work.load(more: true)),
                    child: const Text('Xem thêm công việc')),
            ]),
      );
  Widget _picker() => ListView(
          key: const PageStorageKey('work-parts'),
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
                controller: _search,
                key: const ValueKey('part_search'),
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _loadParts(),
                decoration: const InputDecoration(
                    labelText: 'Tìm mã hoặc tên phụ tùng',
                    border: OutlineInputBorder())),
            TextButton.icon(
                onPressed: () => _loadParts(),
                icon: const Icon(Icons.search),
                label: const Text('Tìm phụ tùng')),
            if (_partsError != null)
              _error(_partsError!, retry: () => _loadParts()),
            if (!_partsLoading && _partsError == null && _parts.isEmpty)
              const Text('Không tìm thấy phụ tùng phù hợp.'),
            for (final part in _parts)
              Card(
                  child: ListTile(
                enabled: part.stock > 0,
                title: Text(part.name),
                subtitle:
                    Text('${part.code} · Tồn: ${part.stock} ${part.unit}'),
                trailing: Text(part.stock == 0
                    ? 'Hết hàng'
                    : _selections.containsKey(part.id)
                        ? 'Đã chọn'
                        : 'Chọn'),
                onTap: part.stock == 0
                    ? null
                    : () => setState(() {
                          _selections.putIfAbsent(
                              part.id, () => PartSelection(part, 1));
                          _dirty = true;
                          _picking = false;
                          _partsGeneration++;
                        }),
              )),
            if (_partsLoading) const Center(child: CircularProgressIndicator()),
            if (!_partsLoading && _partsPage?.hasMore == true)
              TextButton(
                  onPressed: () => _loadParts(more: true),
                  child: const Text('Xem thêm phụ tùng')),
          ]);
  Widget _partEditor(PartSelection selection) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('${selection.part.name} · ${selection.part.code}'),
          const SizedBox(height: 8),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: TextFormField(
              key: ValueKey('quantity_${selection.part.id}'),
              initialValue: '${selection.quantity}',
              enabled: !_work.actionBusy,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9)
              ],
              decoration: InputDecoration(
                  labelText: 'Số lượng (${selection.part.unit})',
                  helperText: 'Tồn kho: ${selection.part.stock}',
                  errorText: selection.quantity < 1 ||
                          selection.quantity > selection.part.stock
                      ? 'Số lượng vượt giới hạn'
                      : null,
                  border: const OutlineInputBorder()),
              onChanged: (value) => setState(() {
                _dirty = true;
                _formError = null;
                _selections[selection.part.id] =
                    PartSelection(selection.part, int.tryParse(value) ?? 0);
              }),
            )),
            IconButton(
                tooltip: 'Bỏ phụ tùng',
                onPressed: _work.actionBusy
                    ? null
                    : () => setState(() {
                          _selections.remove(selection.part.id);
                          _dirty = true;
                        }),
                icon: const Icon(Icons.delete_outline)),
          ]),
        ]),
      );
  Widget _completionForm() => _card('Kết quả thực hiện', [
        TextField(
            controller: _notes,
            key: const ValueKey('completion_notes'),
            enabled: !_work.actionBusy,
            maxLines: 3,
            maxLength: 5000,
            onChanged: _changed,
            decoration: const InputDecoration(
                labelText: 'Ghi chú xử lý', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        TextField(
            controller: _hours,
            key: const ValueKey('actual_hours'),
            enabled: !_work.actionBusy,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            onChanged: _changed,
            decoration: const InputDecoration(
                labelText: 'Thời gian thực hiện (giờ)',
                hintText: 'Ví dụ: 0,5',
                border: OutlineInputBorder())),
        const SizedBox(height: 16),
        const Text('Phụ tùng đã sử dụng',
            style: TextStyle(fontWeight: FontWeight.bold)),
        if (_selections.isEmpty) const Text('Chưa chọn phụ tùng.'),
        ..._selections.values.map(_partEditor),
        OutlinedButton.icon(
            onPressed: _work.actionBusy || _work.mustRefresh
                ? null
                : () {
                    setState(() => _picking = true);
                    unawaited(_loadParts());
                  },
            icon: const Icon(Icons.add),
            label: const Text('Thêm phụ tùng')),
        if (_formError != null) _error(_formError!),
        const SizedBox(height: 12),
        FilledButton(
            onPressed: _work.actionBusy || _work.mustRefresh
                ? null
                : _prepareCompletion,
            child: const Text('Hoàn thành')),
      ]);
  Widget _reviewCard(WorkOrder order) => _card('Xác nhận kết quả', [
        Text(order.code),
        _row('Thời gian', '${_hours.text.trim()} giờ'),
        Text(_notes.text.trim()),
        const SizedBox(height: 12),
        if (_selections.isEmpty) const Text('Không sử dụng phụ tùng.'),
        for (final selection in _selections.values)
          Text(
              '${selection.part.name}: ${selection.quantity} ${selection.part.unit}'),
        const SizedBox(height: 16),
        FilledButton(
            onPressed: _work.actionBusy || _work.mustRefresh ? null : _complete,
            child: const Text('Xác nhận hoàn thành')),
        TextButton(
            onPressed:
                _work.actionBusy ? null : () => setState(() => _review = false),
            child: const Text('Quay lại chỉnh sửa')),
      ]);
  Widget _detail() {
    if (_discard) {
      return ListView(padding: const EdgeInsets.all(20), children: [
        const Text(
            'Bạn có thay đổi chưa gửi. Bạn muốn tiếp tục chỉnh sửa hay bỏ các thay đổi này?'),
        const SizedBox(height: 16),
        FilledButton(
            onPressed: () => setState(() => _discard = false),
            child: const Text('Tiếp tục chỉnh sửa')),
        TextButton(
            onPressed: () {
              _clearDraft();
              _work.close();
            },
            child: const Text('Bỏ thay đổi')),
      ]);
    }
    final order = _work.selected;
    if (_work.detailLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (order == null) {
      return ListView(children: [
        _error(_work.error ?? 'Không tải được chi tiết công việc.',
            retry: () => _refreshDetail()),
      ]);
    }
    return ListView(
        key: PageStorageKey('work-detail-${order.id}'),
        padding: const EdgeInsets.all(16),
        children: [
          Text(order.code,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(order.title, style: Theme.of(context).textTheme.headlineSmall),
          _card('Thông tin công việc', [
            _row('Trạng thái', order.status.label),
            _row('Ưu tiên', order.priority.label),
            _row('Thiết bị', '${order.assetCode} · ${order.assetName}'),
            if (order.description != null) Text(order.description!),
            _row('Hạn dự kiến', workDate(order.scheduledEnd)),
            if (order.startedAt != null)
              _row('Bắt đầu', workDate(order.startedAt)),
          ]),
          if (_work.error != null)
            _error(_work.error!,
                retry: _work.actionBusy ? null : () => _refreshDetail()),
          if (_work.actionBusy)
            const Padding(
                padding: EdgeInsets.all(16),
                child: Column(children: [
                  LinearProgressIndicator(),
                  SizedBox(height: 8),
                  Text('Đang gửi kết quả…'),
                ])),
          if (order.canStart(widget.technicianId))
            FilledButton.icon(
                onPressed: _work.actionBusy || _work.mustRefresh
                    ? null
                    : () => _guard(_work.start()),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Bắt đầu làm')),
          if (order.canComplete(widget.technicianId))
            _review ? _reviewCard(order) : _completionForm(),
          if (order.status == WorkOrderStatus.completed ||
              order.status == WorkOrderStatus.closed)
            _card('Báo cáo hoàn thành', [
              Text(order.status == WorkOrderStatus.completed
                  ? 'Đã hoàn thành, chờ quản lý nghiệm thu.'
                  : 'Công việc đã được nghiệm thu.'),
              _row('Hoàn thành', workDate(order.completedAt)),
              _row('Thời gian thực hiện', '${order.actualHours} giờ'),
              Text(order.completionNotes ?? 'Chưa có ghi chú.'),
              for (final part in order.parts)
                Text('${part.name} · ${part.quantity} ${part.unit}'),
            ]),
          const SizedBox(height: 20),
        ]);
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
      animation: _work,
      builder: (context, _) => PopScope(
            canPop: false,
            onPopInvokedWithResult: (didPop, result) {
              if (!didPop) {
                if (MediaQuery.viewInsetsOf(context).bottom > 0) {
                  FocusScope.of(context).unfocus();
                  return;
                }
                _back();
              }
            },
            child: Scaffold(
              appBar: AppBar(
                  title: Text(_picking
                      ? 'Chọn phụ tùng'
                      : _work.selectedId != null
                          ? 'Chi tiết công việc'
                          : 'Công việc được giao'),
                  leading: IconButton(
                      tooltip: 'Quay lại',
                      onPressed: _work.actionBusy ? null : _back,
                      icon: const Icon(Icons.arrow_back)),
                  actions: [
                    if (_work.selectedId != null && !_picking)
                      IconButton(
                          tooltip: 'Cập nhật công việc',
                          onPressed: _work.actionBusy || _work.detailLoading
                              ? null
                              : _refreshDetail,
                          icon: const Icon(Icons.refresh))
                  ]),
              body: Column(children: [
                if (widget.repository.isDemo)
                  Container(
                      width: double.infinity,
                      color: const Color(0xFFFFF3CD),
                      padding: const EdgeInsets.all(12),
                      child: const Text(
                          'DỮ LIỆU MẪU · Thao tác chỉ lưu trong phiên chạy thử.',
                          style: TextStyle(
                              color: Color(0xFF664D03),
                              fontWeight: FontWeight.w600))),
                Expanded(
                    child: _picking
                        ? _picker()
                        : _work.selectedId == null
                            ? _list()
                            : _detail()),
              ]),
            ),
          ));
}
