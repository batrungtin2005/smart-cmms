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
  List<MaterialRequest> requests = [];
  ResultPage<MaterialRequest>? materialsPage;
  int pendingMaterials = 0;
  bool materialsReady = false,
      materialsLoading = false,
      materialReviewRequired = false;
  String? materialsError;
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
      materialReviewRequired = false;
      requests = [];
      materialsPage = null;
      pendingMaterials = 0;
    }
    materialsReady = false;
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
      await _loadMaterials(id, generation);
    } catch (failure) {
      if (!_disposed && generation == _detailGeneration) {
        _failure(failure);
        if (failure is ApiException &&
            [401, 403, 404].contains(failure.statusCode)) {
          orders.removeWhere((order) => order.id == id);
          selectedId = null;
          selected = null;
          requests = [];
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
    materialsReady = false;
    materialReviewRequired = false;
    requests = [];
    materialsPage = null;
    materialsError = null;
    materialsLoading = false;
    pendingMaterials = 0;
    error = null;
    _notify();
  }

  Future<void> _loadMaterials(String id, int generation,
      {bool more = false}) async {
    materialsLoading = true;
    materialsError = null;
    _notify();
    try {
      final page = more ? materialsPage!.page + 1 : 1;
      final result = await repository.materials(id, technicianId, page: page);
      if (_disposed || generation != _detailGeneration || selectedId != id) {
        return;
      }
      final pending = result.hasMore || more
          ? (await repository.materials(id, technicianId,
                  status: MaterialStatus.pending))
              .total
          : result.items
              .where((r) => r.status == MaterialStatus.pending)
              .length;
      if (_disposed || generation != _detailGeneration || selectedId != id) {
        return;
      }
      final merged = {
        if (more)
          for (final r in requests) r.id: r
      };
      for (final request in result.items) {
        merged[request.id] = request;
      }
      requests = merged.values.toList();
      materialsPage = result;
      pendingMaterials = pending;
      materialsReady = true;
    } catch (failure) {
      if (!_disposed && generation == _detailGeneration) {
        materialsError = _message(failure);
        materialsReady = false;
        if (failure is ApiException &&
            [401, 403, 404].contains(failure.statusCode)) {
          requests = [];
        }
      }
    } finally {
      if (!_disposed && generation == _detailGeneration) {
        materialsLoading = false;
        _notify();
      }
    }
  }

  Future<void> moreMaterials() async {
    if (actionBusy ||
        materialsLoading ||
        materialsPage?.hasMore != true ||
        selectedId == null) {
      return;
    }
    await _loadMaterials(selectedId!, _detailGeneration, more: true);
  }

  Future<void> materialDetail(MaterialRequest request) async {
    if (_disposed || actionBusy) return;
    final generation = _detailGeneration;
    actionBusy = true;
    _notify();
    try {
      final result = await repository.materialDetail(request, technicianId);
      if (!_disposed && generation == _detailGeneration) {
        requests = requests.map((r) => r.id == result.id ? result : r).toList();
      }
    } catch (failure) {
      if (!_disposed) materialsError = _message(failure);
    } finally {
      actionBusy = false;
      _notify();
    }
  }

  void acknowledgeMaterialReview() {
    if (materialsReady && !mustRefresh && !actionBusy) {
      materialReviewRequired = false;
      _notify();
    }
  }

  Future<bool> requestMaterials(MaterialDraft draft) async {
    final order = selected;
    if (order == null || !materialsReady || materialReviewRequired) {
      return false;
    }
    return _materialChange(
        () => repository.requestMaterials(order, draft, technicianId),
        creating: true);
  }

  Future<bool> cancelMaterial(MaterialRequest request, String reason) =>
      _materialChange(
          () => repository.cancelMaterial(request, reason, technicianId));

  Future<bool> _materialChange(Future<MaterialRequest> Function() operation,
      {bool creating = false}) async {
    if (_disposed ||
        actionBusy ||
        mustRefresh ||
        detailLoading ||
        selectedId == null) {
      return false;
    }
    final id = selectedId!, generation = _detailGeneration;
    actionBusy = true;
    error = null;
    _notify();
    try {
      await operation();
      if (_disposed) return false;
      await _loadMaterials(id, generation);
      return true;
    } catch (failure) {
      if (_disposed) return false;
      _failure(failure);
      if (_uncertain(failure)) {
        mustRefresh = true;
        if (creating) materialReviewRequired = true;
        error =
            'Chưa xác nhận được kết quả. Tải lại công việc và kiểm tra danh sách yêu cầu trước khi gửi tiếp.';
      }
      if (failure is ApiException && [403, 404].contains(failure.statusCode)) {
        selected = null;
        selectedId = null;
        requests = [];
        materialsReady = false;
        orders.removeWhere((order) => order.id == id);
        listError = error;
      }
      return false;
    } finally {
      actionBusy = false;
      _notify();
    }
  }

  bool _uncertain(Object failure) =>
      failure is! WorkOrderValidation &&
      (failure is! ApiException ||
          failure.statusCode == null ||
          failure.statusCode == 409 ||
          (failure.statusCode ?? 0) >= 500);

  Future<bool> pause(String reason) => _change(null, pauseReason: reason);

  bool get canFinish =>
      materialsReady &&
      !materialsLoading &&
      pendingMaterials == 0 &&
      !materialReviewRequired &&
      !mustRefresh &&
      !actionBusy &&
      !detailLoading;

  Future<bool> start() => _change(null);
  Future<bool> complete(CompletionDraft draft) => _change(draft);
  Future<bool> _change(CompletionDraft? draft, {String? pauseReason}) async {
    final order = selected;
    if (_disposed ||
        actionBusy ||
        mustRefresh ||
        detailLoading ||
        order == null) {
      return false;
    }
    if (draft != null && !canFinish) return false;
    actionBusy = true;
    error = null;
    _notify();
    try {
      final updated = pauseReason != null
          ? await repository.pause(order, pauseReason, technicianId)
          : draft == null
              ? await repository.start(order, technicianId)
              : await repository.complete(order, draft, technicianId);
      if (_disposed) return false;
      selected = updated;
      _replace(updated);
      mustRefresh = false;
      await _loadMaterials(order.id, _detailGeneration);
      return true;
    } catch (failure) {
      if (_disposed) return false;
      _failure(failure);
      if (draft != null &&
          failure is ApiException &&
          failure.statusCode == 422) {
        error = 'Thông tin hoàn thành chưa hợp lệ. Hãy kiểm tra lại báo cáo.';
      }
      if (_uncertain(failure)) {
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
