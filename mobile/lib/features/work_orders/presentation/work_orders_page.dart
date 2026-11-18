import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/network/api_client.dart';
import '../domain/work_order.dart';
import '../domain/work_order_repository.dart';
import '../domain/local_work_orders.dart';
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
      _rootCause = TextEditingController(),
      _solution = TextEditingController(),
      _materialNotes = TextEditingController(),
      _reason = TextEditingController(),
      _search = TextEditingController();
  final _selections = <String, PartSelection>{};
  bool _dirty = false, _review = false, _discard = false, _picking = false;
  bool _reportDirty = false, _pausing = false;
  String? _cancelling;
  String? _formError, _partsError, _materialFormError;
  bool _partsLoading = false;
  int _partsGeneration = 0;
  List<StockPart> _parts = [];
  ResultPage<StockPart>? _partsPage;
  LocalWorkOrders? get _local => widget.repository is LocalWorkOrders
      ? widget.repository as LocalWorkOrders
      : null;
  Future<void> _draftWrites = Future.value();
  StreamSubscription<void>? _connectionSubscription;
  int _draftRevision = 0;
  String? _draftMessage;

  @override
  void initState() {
    super.initState();
    _work = WorkOrderController(widget.repository, widget.technicianId);
    _connectionSubscription = _local?.connectionChanges.listen((_) {
      if (mounted) setState(() {});
    });
    unawaited(_guard(_work.load()));
  }

  @override
  void dispose() {
    unawaited(_connectionSubscription?.cancel());
    _work.dispose();
    _notes.dispose();
    _rootCause.dispose();
    _solution.dispose();
    _materialNotes.dispose();
    _reason.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<T> _guard<T>(Future<T> request) async {
    final result = await request;
    if (mounted && _work.sessionExpired) await widget.onSessionExpired();
    return result;
  }

  Future<bool> _persistDraft() async {
    final local = _local, id = _work.selectedId;
    if (local == null || id == null) return true;
    final draft = SavedWorkDraft(
        report: _draft(),
        material: MaterialDraft(
            parts: _selections.values.toList(), notes: _materialNotes.text),
        reviewRequired: _work.materialReviewRequired);
    final dirty = _dirty;
    final revision = ++_draftRevision;
    var saved = true;
    final write = _draftWrites.then((_) => dirty
        ? local.saveDraft(widget.technicianId, id, draft)
        : local.deleteDraft(widget.technicianId, id));
    _draftWrites = write.then<void>((_) {
      if (mounted && revision == _draftRevision) {
        setState(
            () => _draftMessage = dirty ? 'Bản nháp đã lưu trên máy.' : null);
      }
    }, onError: (Object _, StackTrace __) {
      saved = false;
      if (mounted && revision == _draftRevision) {
        setState(() => _draftMessage =
            'Chưa lưu được bản nháp. Giữ màn hình này và thử lại.');
      }
    });
    await _draftWrites;
    return saved;
  }

  Future<bool> _deleteDraft() async {
    final id = _work.selectedId;
    if (_local == null || id == null) return true;
    await _draftWrites;
    try {
      await _local!.deleteDraft(widget.technicianId, id);
      return true;
    } catch (_) {
      if (mounted) {
        setState(() => _draftMessage = 'Chưa xóa được bản nháp. Hãy thử lại.');
      }
      return false;
    }
  }

  void _clearDraft() {
    _draftRevision++;
    _draftMessage = null;
    _notes.clear();
    _rootCause.clear();
    _solution.clear();
    _materialNotes.clear();
    _reason.clear();
    _selections.clear();
    _dirty = false;
    _reportDirty = false;
    _pausing = false;
    _cancelling = null;
    _review = false;
    _discard = false;
    _picking = false;
    _formError = null;
    _materialFormError = null;
    _partsGeneration++;
  }

  Future<void> _open(WorkOrder order) async {
    await _draftWrites;
    if (!mounted) return;
    _clearDraft();
    await _guard(_work.open(order.id));
    if (!mounted || _work.selected?.id != order.id) return;
    _rootCause.text = _work.selected!.rootCause ?? '';
    _solution.text = _work.selected!.solution ?? '';
    _notes.text = _work.selected!.completionNotes ?? '';
    final selected = _work.selected!;
    if (_local != null &&
        ![
          WorkOrderStatus.completed,
          WorkOrderStatus.closed,
          WorkOrderStatus.cancelled
        ].contains(selected.status)) {
      try {
        final saved = await _local!.loadDraft(widget.technicianId, order.id);
        if (!mounted || _work.selectedId != order.id || saved == null) return;
        setState(() {
          _rootCause.text = saved.report.rootCause;
          _solution.text = saved.report.solution;
          _notes.text = saved.report.notes;
          _materialNotes.text = saved.material.notes;
          _selections.addEntries(
              saved.material.parts.map((p) => MapEntry(p.part.id, p)));
          _dirty = true;
          _reportDirty = saved.report.rootCause.isNotEmpty ||
              saved.report.solution.isNotEmpty ||
              saved.report.notes.isNotEmpty;
          _work.materialReviewRequired = saved.reviewRequired;
          _work.mustRefresh = saved.reviewRequired;
          _draftMessage = 'Đã khôi phục bản nháp trên máy.';
        });
      } catch (_) {
        if (mounted) {
          setState(() => _draftMessage = 'Chưa đọc được bản nháp trên máy.');
        }
      }
    }
  }

  void _back() {
    if (_work.actionBusy) return;
    if (_pausing || _cancelling != null) {
      setState(() {
        _pausing = false;
        _cancelling = null;
        _reason.clear();
      });
      return;
    }
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
    _reportDirty = true;
    if (_formError != null) setState(() => _formError = null);
    unawaited(_persistDraft());
  }

  CompletionDraft _draft() => CompletionDraft(
      notes: _notes.text, rootCause: _rootCause.text, solution: _solution.text);
  void _prepareCompletion() {
    FocusScope.of(context).unfocus();
    try {
      if (_selections.isNotEmpty || _materialNotes.text.trim().isNotEmpty) {
        throw const WorkOrderValidation(
            'Gửi hoặc bỏ yêu cầu vật tư đang soạn trước khi hoàn thành.');
      }
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
    if (success) await _deleteDraft();
    if (!mounted) return;
    setState(() {
      _review = false;
      if (success) _dirty = false;
    });
  }

  Future<void> _refreshDetail() async {
    final id = _work.selectedId;
    if (id == null) return;
    await _local?.recheckConnection();
    await _guard(_work.open(id));
    if (!mounted) return;
    if (_work.selected != null &&
        [
          WorkOrderStatus.completed,
          WorkOrderStatus.closed,
          WorkOrderStatus.cancelled
        ].contains(_work.selected!.status)) {
      setState(() {
        _dirty = false;
        _review = false;
        _selections.clear();
        _materialNotes.clear();
      });
      await _deleteDraft();
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
  Widget _identified(String id, Widget field) =>
      Semantics(container: true, identifier: id, child: field);
  Widget _card(String title, List<Widget> children) => Card(
      key: ValueKey('work_card_$title'),
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

  Future<void> _refreshList() async {
    await _local?.recheckConnection();
    await _guard(_work.load(filter: _work.priority));
  }

  Widget _list() => RefreshIndicator(
        onRefresh: _refreshList,
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
              if (_work.listPage?.cachedAt != null)
                Text(
                    'Dữ liệu đã tải về · cập nhật: ${_work.listPage!.cachedAt!.toLocal()}'),
              if (_work.listError != null)
                _error(_work.listError!, retry: _refreshList),
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
                      '${order.code} · ${order.priority.label}\n${order.status.label} · ${order.assetCode}${order.pendingSync ? ' · Chờ đồng bộ' : ''}'),
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
            if (_partsPage?.cachedAt != null)
              const Text('Phụ tùng đã lưu trên máy. Tồn kho chỉ để tham khảo.'),
            _identified(
                'work_part_search',
                TextField(
                    controller: _search,
                    key: const ValueKey('part_search'),
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _loadParts(),
                    decoration: const InputDecoration(
                        labelText: 'Tìm mã hoặc tên phụ tùng',
                        border: OutlineInputBorder()))),
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
                title: Text(part.name),
                subtitle:
                    Text('${part.code} · Tồn: ${part.stock} ${part.unit}'),
                trailing: Text(part.stock == 0
                    ? 'Hết hàng'
                    : _selections.containsKey(part.id)
                        ? 'Đã chọn'
                        : 'Chọn'),
                onTap: () => setState(() {
                  _selections.putIfAbsent(
                      part.id, () => PartSelection(part, 1));
                  _dirty = true;
                  _picking = false;
                  _partsGeneration++;
                  unawaited(_persistDraft());
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
                child: _identified(
                    'work_quantity_${selection.part.id}',
                    TextFormField(
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
                                  selection.quantity > 1000000
                              ? 'Số lượng vượt giới hạn'
                              : null,
                          border: const OutlineInputBorder()),
                      onChanged: (value) => setState(() {
                        _dirty = true;
                        _formError = null;
                        _selections[selection.part.id] = PartSelection(
                            selection.part, int.tryParse(value) ?? 0);
                        unawaited(_persistDraft());
                      }),
                    ))),
            IconButton(
                tooltip: 'Bỏ phụ tùng',
                onPressed: _work.actionBusy
                    ? null
                    : () => setState(() {
                          _selections.remove(selection.part.id);
                          _dirty = true;
                          unawaited(_persistDraft());
                        }),
                icon: const Icon(Icons.delete_outline)),
          ]),
        ]),
      );
  Widget _completionForm() => _card('Kết quả thực hiện', [
        _identified(
            'work_root_cause',
            TextField(
                controller: _rootCause,
                key: const ValueKey('root_cause'),
                enabled: !_work.actionBusy,
                maxLength: 255,
                onChanged: _changed,
                decoration: const InputDecoration(
                    labelText: 'Nguyên nhân', border: OutlineInputBorder()))),
        const SizedBox(height: 12),
        _identified(
            'work_solution',
            TextField(
                controller: _solution,
                key: const ValueKey('solution'),
                enabled: !_work.actionBusy,
                maxLines: 3,
                maxLength: 10000,
                onChanged: _changed,
                decoration: const InputDecoration(
                    labelText: 'Cách xử lý', border: OutlineInputBorder()))),
        const SizedBox(height: 12),
        _identified(
            'work_completion_notes',
            TextField(
                controller: _notes,
                key: const ValueKey('completion_notes'),
                enabled: !_work.actionBusy,
                maxLines: 3,
                maxLength: 10000,
                onChanged: _changed,
                decoration: const InputDecoration(
                    labelText: 'Ghi chú thêm (không bắt buộc)',
                    border: OutlineInputBorder()))),
        const SizedBox(height: 12),
        const Text(
            'Máy chủ tự tính thời gian sửa chữa, không tính thời gian tạm dừng.'),
        if (!_work.materialsReady)
          const Text('Cần tải được trạng thái vật tư trước khi hoàn thành.'),
        if (_work.pendingMaterials > 0)
          Text(
              'Còn ${_work.pendingMaterials} yêu cầu vật tư chờ duyệt. Chờ thủ kho xử lý hoặc hủy yêu cầu.'),
        if (_formError != null) _error(_formError!),
        const SizedBox(height: 12),
        FilledButton(
            onPressed: _work.canFinish ? _prepareCompletion : null,
            child: const Text('Hoàn thành')),
      ]);

  Future<void> _sendMaterials() async {
    if (_work.actionBusy) return;
    FocusScope.of(context).unfocus();
    if (!await _persistDraft() || !mounted || _work.actionBusy) return;
    final draft = MaterialDraft(
        parts: _selections.values.toList(), notes: _materialNotes.text);
    try {
      draft.validate();
    } on WorkOrderValidation catch (failure) {
      setState(() => _materialFormError = failure.message);
      return;
    }
    final success = await _guard(_work.requestMaterials(draft));
    if (!mounted) return;
    setState(() {
      if (success) {
        _selections.clear();
        _materialNotes.clear();
        _dirty = _reportDirty;
        _materialFormError = null;
      }
    });
    await _persistDraft();
  }

  Widget _materials(WorkOrder order) => _card('Vật tư cho công việc', [
        const Text(
            'Gửi yêu cầu → thủ kho duyệt và cấp vật tư → cập nhật công việc để xem kết quả.'),
        if (widget.repository.isDemo)
          const Text(
              'Bản mẫu không mô phỏng tài khoản thủ kho. Có thể hủy yêu cầu chờ; luồng cấp vật tư cần chạy với backend thật.'),
        if (_work.materialsLoading) const LinearProgressIndicator(),
        if (_work.materialsError != null)
          _error(_work.materialsError!, retry: _refreshDetail),
        for (final request in _work.requests) ...[
          const Divider(),
          Text(
              'Yêu cầu ${request.id.substring(0, request.id.length < 8 ? request.id.length : 8)} · ${request.status.label}',
              key: ValueKey('material_${request.id}'),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          if (request.notes?.isNotEmpty == true) Text(request.notes!),
          if (request.pendingSync)
            const Text('Thay đổi vật tư này đang chờ đồng bộ.'),
          if (request.reason != null) Text('Lý do: ${request.reason}'),
          for (final item in request.items)
            Text('${item.name} · ${item.quantity} ${item.unit}'),
          if (request.items.isEmpty)
            TextButton(
                onPressed: _work.actionBusy
                    ? null
                    : () => _guard(_work.materialDetail(request)),
                child: const Text('Xem vật tư yêu cầu')),
          if (request.status == MaterialStatus.pending &&
              _cancelling != request.id)
            TextButton(
                onPressed: _work.actionBusy || _work.mustRefresh
                    ? null
                    : () => setState(() {
                          _cancelling = request.id;
                          _pausing = false;
                          _reason.clear();
                        }),
                child: const Text('Hủy yêu cầu')),
          if (_cancelling == request.id) ...[
            TextField(
                controller: _reason,
                key: const ValueKey('cancel_reason'),
                maxLength: 1000,
                decoration:
                    const InputDecoration(labelText: 'Lý do hủy yêu cầu')),
            TextButton(
                onPressed: _work.actionBusy
                    ? null
                    : () async {
                        final success = await _guard(
                            _work.cancelMaterial(request, _reason.text));
                        if (mounted && success) {
                          setState(() {
                            _cancelling = null;
                            _reason.clear();
                          });
                        }
                      },
                child: const Text('Xác nhận hủy yêu cầu')),
          ],
        ],
        if (_work.materialsPage?.hasMore == true)
          TextButton(
              onPressed: _work.materialsLoading || _work.actionBusy
                  ? null
                  : () => _guard(_work.moreMaterials()),
              child: const Text('Xem thêm yêu cầu')),
        if (_work.materialReviewRequired) ...[
          const Text(
              'Kết quả gửi trước chưa rõ. Tải lại, kiểm tra các yêu cầu vừa gửi để tránh tạo trùng.'),
          TextButton(
              onPressed:
                  !_work.materialsReady || _work.mustRefresh || _work.actionBusy
                      ? null
                      : () {
                          _work.acknowledgeMaterialReview();
                          setState(() {
                            _selections.clear();
                            _materialNotes.clear();
                            _dirty = _reportDirty;
                          });
                          unawaited(_persistDraft());
                        },
              child: const Text('Đã kiểm tra yêu cầu, bắt đầu bản nháp mới')),
        ],
        if (order.canRequestMaterials(widget.technicianId)) ...[
          const SizedBox(height: 16),
          const Text('Soạn yêu cầu vật tư',
              style: TextStyle(fontWeight: FontWeight.bold)),
          if (_selections.isEmpty) const Text('Chưa chọn phụ tùng.'),
          ..._selections.values.map(_partEditor),
          OutlinedButton.icon(
              onPressed: _work.actionBusy ||
                      _work.mustRefresh ||
                      _work.materialReviewRequired
                  ? null
                  : () {
                      setState(() => _picking = true);
                      unawaited(_loadParts());
                    },
              icon: const Icon(Icons.add),
              label: const Text('Thêm phụ tùng')),
          _identified(
              'work_material_notes',
              TextField(
                  controller: _materialNotes,
                  key: const ValueKey('material_notes'),
                  maxLength: 1000,
                  enabled: !_work.actionBusy,
                  onChanged: (_) {
                    _dirty = true;
                    unawaited(_persistDraft());
                  },
                  decoration: const InputDecoration(
                      labelText: 'Ghi chú yêu cầu vật tư'))),
          if (_materialFormError != null) _error(_materialFormError!),
          const SizedBox(height: 12),
          FilledButton(
              onPressed: _work.actionBusy ||
                      _work.mustRefresh ||
                      _work.materialReviewRequired ||
                      !_work.materialsReady
                  ? null
                  : _sendMaterials,
              child: const Text('Gửi yêu cầu vật tư')),
        ],
      ]);
  Widget _reviewCard(WorkOrder order) => _card('Xác nhận kết quả', [
        Text(order.code),
        _row('Nguyên nhân', _rootCause.text.trim()),
        _row('Cách xử lý', _solution.text.trim()),
        Text(_notes.text.trim()),
        const SizedBox(height: 12),
        if (order.parts.isEmpty) const Text('Chưa có vật tư được cấp.'),
        for (final selection in order.parts)
          Text('${selection.name}: ${selection.quantity} ${selection.unit}'),
        const SizedBox(height: 16),
        FilledButton(
            onPressed: _work.canFinish ? _complete : null,
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
        if (_local != null)
          TextButton(
              onPressed: () async {
                if (!await _persistDraft() || !mounted) return;
                _clearDraft();
                _work.close();
              },
              child: const Text('Giữ bản nháp và quay lại')),
        TextButton(
            onPressed: () async {
              if (!await _deleteDraft() || !mounted) return;
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
          if (order.cachedAt != null)
            Text('Dữ liệu đã lưu · cập nhật: ${order.cachedAt!.toLocal()}'),
          if (order.pendingSync)
            const Text('Có thay đổi chỉ lưu trên máy, chờ đồng bộ.'),
          if (_draftMessage != null) Text(_draftMessage!),
          _card('Thông tin công việc', [
            _row('Trạng thái', order.status.label),
            _row('Ưu tiên', order.priority.label),
            _row('Thiết bị', '${order.assetCode} · ${order.assetName}'),
            if (order.description != null) Text(order.description!),
            _row('Hạn dự kiến', workDate(order.scheduledEnd)),
            if (order.startedAt != null)
              _row('Bắt đầu', workDate(order.startedAt)),
            if (order.verificationNotes != null)
              _row('Ghi chú nghiệm thu', order.verificationNotes!),
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
                label: Text(order.status == WorkOrderStatus.onHold
                    ? 'Tiếp tục làm'
                    : order.status == WorkOrderStatus.reworkRequired
                        ? 'Bắt đầu sửa lại'
                        : 'Bắt đầu làm')),
          if (order.canComplete(widget.technicianId)) ...[
            TextButton(
                onPressed: _work.actionBusy || _work.mustRefresh
                    ? null
                    : () => setState(() {
                          _pausing = !_pausing;
                          _cancelling = null;
                          _reason.clear();
                        }),
                child: const Text('Tạm dừng công việc')),
            if (_pausing)
              _card('Lý do tạm dừng', [
                TextField(
                    controller: _reason,
                    key: const ValueKey('pause_reason'),
                    maxLength: 1000,
                    decoration:
                        const InputDecoration(labelText: 'Lý do tạm dừng')),
                TextButton(
                    onPressed: _work.actionBusy
                        ? null
                        : () async {
                            final success =
                                await _guard(_work.pause(_reason.text));
                            if (mounted && success) {
                              setState(() {
                                _pausing = false;
                                _reason.clear();
                                _review = false;
                              });
                            }
                          },
                    child: const Text('Xác nhận tạm dừng')),
              ]),
          ],
          _materials(order),
          if (order.canComplete(widget.technicianId))
            _review ? _reviewCard(order) : _completionForm(),
          if (order.status == WorkOrderStatus.completed ||
              order.status == WorkOrderStatus.closed)
            _card('Báo cáo hoàn thành', [
              Text(order.pendingSync
                  ? 'Đã ghi hoàn thành trên máy, chờ đồng bộ.'
                  : order.status == WorkOrderStatus.completed
                      ? 'Đã hoàn thành, chờ quản lý nghiệm thu.'
                      : 'Công việc đã được nghiệm thu.'),
              _row('Hoàn thành', workDate(order.completedAt)),
              if (!order.pendingSync)
                _row('Thời gian thực hiện', '${order.actualHours} giờ')
              else
                const Text(
                    'Thời gian sửa sẽ được máy chủ xác nhận sau khi đồng bộ.'),
              _row('Nguyên nhân', order.rootCause ?? 'Chưa cập nhật'),
              _row('Cách xử lý', order.solution ?? 'Chưa cập nhật'),
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
                if (_local?.offline == true)
                  Container(
                      width: double.infinity,
                      color: const Color(0xFFFFF3CD),
                      padding: const EdgeInsets.all(12),
                      child: const Text(
                          'Đang làm việc offline · Chỉ dùng dữ liệu đã tải về.')),
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
