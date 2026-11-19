import '../../../core/local/local_operation.dart';
import 'work_order.dart';

abstract interface class LocalWorkOrders {
  bool get offline;
  Stream<void> get connectionChanges;
  Future<void> recheckConnection();
  Future<SavedWorkDraft?> loadDraft(String user, String workId);
  Future<void> saveDraft(String user, String workId, SavedWorkDraft draft);
  Future<void> deleteDraft(String user, String workId);
  Future<List<LocalOperation>> queuedOperations(String user);
}
