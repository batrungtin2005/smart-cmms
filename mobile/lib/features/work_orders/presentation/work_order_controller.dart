import 'package:flutter/foundation.dart';

import '../../../core/network/api_client.dart';
import '../domain/work_order.dart';
import '../domain/work_order_repository.dart';

class WorkOrderController extends ChangeNotifier {
  WorkOrderController(this.repository, this.technicianId);
  final WorkOrderRepository repository;
  final String technicianId;
  List<WorkOrder> orders = [];
  WorkOrderPriority? priority;
  ResultPage<WorkOrder>? listPage;
  String? selectedId;
  WorkOrder? selected;
  bool loading = false,
      detailLoading = false,
      actionBusy = false,
      mustRefresh = false;
  String? error, listError;
  bool sessionExpired = false, _disposed = false;
  int _listGeneration = 0, _detailGeneration = 0;

  Future<void> load({WorkOrderPriority? filter, bool more = false}) async {
    if (_disposed ||
        actionBusy ||
        (more && (loading || listPage?.hasMore != true))) {
      return;
    }
    final generation = ++_listGeneration;
    if (!more) {
      priority = filter;
      orders = [];
      listPage = null;
    }
    final page = more ? listPage!.page + 1 : 1;
    loading = true;
    listError = null;
    _notify();
    try {
      final result = await repository.assigned(technicianId,
          priority: priority, page: page);
      if (_disposed || generation != _listGeneration) return;
      final merged = {for (final order in orders) order.id: order};
      for (final order in result.items) {
        merged[order.id] = order;
      }
      orders = merged.values.toList();
      listPage = result;
    } catch (failure) {
      if (!_disposed && generation == _listGeneration) {
        listError = _message(failure);
      }
    } finally {
      if (!_disposed && generation == _listGeneration) {
        loading = false;
        _notify();
      }
    }
  }

  Future<void> open(String id) async {
    if (_disposed || actionBusy) return;
    final generation = ++_detailGeneration;
    if (selected?.id != id) {
      selected = null;
      mustRefresh = false;
    }
    selectedId = id;
    detailLoading = true;
    error = null;
    _notify();
    try {
      final order = await repository.detail(id, technicianId);
      if (_disposed || generation != _detailGeneration) return;
      selected = order;
      mustRefresh = false;
      _replace(order);
    } catch (failure) {
      if (!_disposed && generation == _detailGeneration) {
        _failure(failure);
        if (failure is ApiException &&
            [401, 403, 404].contains(failure.statusCode)) {
          orders.removeWhere((order) => order.id == id);
          selectedId = null;
          selected = null;
          listError = error;
        }
      }
    } finally {
      if (!_disposed && generation == _detailGeneration) {
        detailLoading = false;
        _notify();
      }
    }
  }

  void close() {
    if (actionBusy || _disposed) return;
    _detailGeneration++;
    selectedId = null;
    selected = null;
    detailLoading = false;
    mustRefresh = false;
    error = null;
    _notify();
  }

  Future<bool> start() => _change(null);
  Future<bool> complete(CompletionDraft draft) => _change(draft);
  Future<bool> _change(CompletionDraft? draft) async {
    final order = selected;
    if (_disposed ||
        actionBusy ||
        mustRefresh ||
        detailLoading ||
        order == null) {
      return false;
    }
    actionBusy = true;
    error = null;
    _notify();
    try {
      final updated = draft == null
          ? await repository.start(order, technicianId)
          : await repository.complete(order, draft, technicianId);
      if (_disposed) return false;
      selected = updated;
      _replace(updated);
      mustRefresh = false;
      return true;
    } catch (failure) {
      if (_disposed) return false;
      _failure(failure);
      if (draft != null &&
          failure is ApiException &&
          failure.statusCode == 422) {
        error =
            'Thông tin hoàn thành hoặc tồn kho đã thay đổi. Hãy kiểm tra lại báo cáo và phụ tùng.';
      }
      if (failure is! WorkOrderValidation &&
          (failure is! ApiException ||
              failure.statusCode == null ||
              failure.statusCode == 409 ||
              (failure.statusCode ?? 0) >= 500)) {
        mustRefresh = true;
        error =
            'Chưa xác nhận được kết quả thao tác. Hãy tải lại trạng thái công việc trước khi thử tiếp.';
      }
      if (failure is ApiException && [403, 404].contains(failure.statusCode)) {
        selected = null;
        selectedId = null;
        listError = error;
        orders.removeWhere((item) => item.id == order.id);
      }
      return false;
    } finally {
      actionBusy = false;
      _notify();
    }
  }

  void _replace(WorkOrder updated) {
    orders = orders
        .map((order) => order.id == updated.id ? updated : order)
        .toList();
  }

  void _failure(Object failure) {
    error = _message(failure);
  }

  String _message(Object failure) {
    if (failure is ApiException) {
      if (failure.statusCode == 401) {
        sessionExpired = true;
      }
      return failure.message;
    } else if (failure is WorkOrderValidation) {
      return failure.message;
    } else {
      return 'Không tải được công việc. Vui lòng thử lại.';
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
