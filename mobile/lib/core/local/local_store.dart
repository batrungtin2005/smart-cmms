import 'dart:convert';

import 'package:path/path.dart' as path;
import 'package:sqflite/sqflite.dart';
import 'local_operation.dart';

class CachedValue {
  const CachedValue(this.data, this.savedAt);
  final Map<String, dynamic> data;
  final DateTime savedAt;
}

/// Account and API environment are both part of every storage key.
/// Tokens and passwords must never be passed to this store.
class LocalStore {
  LocalStore({required this.scope, DatabaseFactory? factory, this.databasePath})
      : _factory = factory ?? databaseFactory;

  static const fileName = 'smart_cmms_offline_v1.db';
  final String scope;
  final DatabaseFactory _factory;
  final String? databasePath;
  Future<Database>? _opening;

  String _account(String user) => jsonEncode([scope, user]);
  Future<Database> get database => _opening ??= _open();
  Future<Database> _open() async {
    try {
      final file = databasePath ??
          path.join(await _factory.getDatabasesPath(), fileName);
      return await _factory.openDatabase(file,
          options: OpenDatabaseOptions(
              version: 1,
              onCreate: (db, version) async {
                await db.execute('''CREATE TABLE cache (
                  account TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL,
                  data TEXT NOT NULL, saved_at TEXT NOT NULL,
                  PRIMARY KEY(account, kind, key))''');
                await db.execute('''CREATE TABLE operations (
                  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                  account TEXT NOT NULL, uuid TEXT NOT NULL UNIQUE,
                  type TEXT NOT NULL, target_id TEXT NOT NULL,
                  payload TEXT NOT NULL, created_at TEXT NOT NULL,
                  status TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK(status IN ('PENDING','SYNCED','CONFLICT','FAILED')),
                  error TEXT)''');
                await db.execute(
                    'CREATE INDEX queue_account ON operations(account, sequence)');
              }));
    } catch (_) {
      _opening = null;
      rethrow;
    }
  }

  Future<CachedValue?> read(String user, String kind, String key) async {
    final rows = await (await database).query('cache',
        where: 'account=? AND kind=? AND key=?',
        whereArgs: [_account(user), kind, key]);
    if (rows.isEmpty) return null;
    return CachedValue(
        jsonDecode(rows.single['data'] as String) as Map<String, dynamic>,
        DateTime.parse(rows.single['saved_at'] as String));
  }

  Future<void> put(
      String user, String kind, String key, Map<String, Object?> data) async {
    await _put(await database, user, kind, key, data);
  }

  Future<void> _put(DatabaseExecutor db, String user, String kind, String key,
      Map<String, Object?> data) async {
    await db.insert(
        'cache',
        {
          'account': _account(user),
          'kind': kind,
          'key': key,
          'data': jsonEncode(data),
          'saved_at': DateTime.now().toUtc().toIso8601String(),
        },
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> remove(String user, String kind, String key) async {
    await (await database).delete('cache',
        where: 'account=? AND kind=? AND key=?',
        whereArgs: [_account(user), kind, key]);
  }

  Future<List<CachedValue>> all(String user, String kind) async {
    final rows = await (await database).query('cache',
        where: 'account=? AND kind=?',
        whereArgs: [_account(user), kind],
        orderBy: 'saved_at');
    return rows
        .map((r) => CachedValue(
            jsonDecode(r['data'] as String) as Map<String, dynamic>,
            DateTime.parse(r['saved_at'] as String)))
        .toList();
  }

  Future<void> invalidateWork(String user, String id) async {
    // Drop list snapshots too: a revoked assignment must not reappear offline.
    await (await database).delete('cache',
        where: 'account=? AND (kind=? OR key=? OR key LIKE ?)',
        whereArgs: [_account(user), 'assigned', id, 'materials:$id:%']);
  }

  /// Projection and queued intent commit together, or both roll back.
  Future<void> enqueue(
      String user, LocalOperation operation, Map<String, Object?> projection,
      {Map<String, Object?>? material,
      Map<String, Object?>? updatedDraft,
      bool deleteDraft = false}) async {
    await (await database).transaction((txn) async {
      await txn.insert('operations', {
        'account': _account(user),
        'uuid': operation.uuid,
        'type': operation.type,
        'target_id': operation.targetId,
        'payload': jsonEncode(operation.payload),
        'created_at': operation.createdAt.toUtc().toIso8601String(),
        'status': 'PENDING',
      });
      await _put(txn, user, 'projection', operation.targetId, projection);
      if (material != null) {
        await _put(
            txn, user, 'local_material', material['id'] as String, material);
      }
      if (deleteDraft) {
        await txn.delete('cache',
            where: 'account=? AND kind=? AND key=?',
            whereArgs: [_account(user), 'draft', operation.targetId]);
      } else if (updatedDraft != null) {
        await _put(txn, user, 'draft', operation.targetId, updatedDraft);
      }
    });
  }

  Future<List<Map<String, dynamic>>> localMaterials(
      String user, String workId) async {
    final rows = await (await database).query('cache',
        where: 'account=? AND kind=?',
        whereArgs: [_account(user), 'local_material']);
    return rows
        .map((row) => jsonDecode(row['data'] as String) as Map<String, dynamic>)
        .where((row) => row['workOrderId'] == workId)
        .toList();
  }

  Future<List<LocalOperation>> operations(String user) async {
    final rows = await (await database).query('operations',
        where: 'account=?', whereArgs: [_account(user)], orderBy: 'sequence');
    return rows
        .map((r) => LocalOperation(
            uuid: r['uuid'] as String,
            type: r['type'] as String,
            targetId: r['target_id'] as String,
            payload: jsonDecode(r['payload'] as String) as Map<String, dynamic>,
            createdAt: DateTime.parse(r['created_at'] as String),
            status: r['status'] as String,
            error: r['error'] as String?))
        .toList();
  }

  Future<void> close() async {
    final pending = _opening;
    if (pending != null) await (await pending).close();
    _opening = null;
  }
}
