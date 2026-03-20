import Dexie, { type EntityTable } from 'dexie'
import type { OfflineQueueItem } from '../types'

interface CachedEntity {
  id: string
  data: Record<string, unknown>
  updated_at: number
}

export class FmisDatabase extends Dexie {
  syncQueue!: EntityTable<OfflineQueueItem, 'id'>
  cachedTransactions!: EntityTable<CachedEntity, 'id'>
  cachedSettings!: EntityTable<{ id: string; value: unknown; updated_at: number }, 'id'>
  cachedCategories!: EntityTable<CachedEntity, 'id'>
  cachedAccounts!: EntityTable<CachedEntity, 'id'>

  constructor() {
    super('fmis_offline_db')
    this.version(1).stores({
      syncQueue: '++id, entity_type, entity_id, action, synced, attempts',
      cachedTransactions: 'id, updated_at',
      cachedSettings: 'id, updated_at',
      cachedCategories: 'id, updated_at',
      cachedAccounts: 'id, updated_at',
    })
  }
}

export const db = new FmisDatabase()

// --- Sync Queue Helpers ---
export async function enqueueOfflineAction(
  entityType: string,
  entityId: string,
  action: 'created' | 'updated' | 'deleted',
  payload: Record<string, unknown>
): Promise<void> {
  await db.syncQueue.add({
    entity_type: entityType,
    entity_id: entityId,
    action,
    payload,
    client_ts: Date.now(),
    synced: false,
    attempts: 0,
  })
}

export async function getPendingChanges(): Promise<OfflineQueueItem[]> {
  return db.syncQueue.where('synced').equals(0).toArray() as unknown as OfflineQueueItem[]
}

export async function markAsSynced(ids: number[]): Promise<void> {
  await db.syncQueue.where('id').anyOf(ids).modify({ synced: true })
}
