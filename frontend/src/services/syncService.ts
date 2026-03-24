import { db, getPendingChanges, markAsSynced } from './db'
import api from './api'
import { toast } from 'react-hot-toast'

export async function syncOfflineRequests() {
  const pending = await getPendingChanges()
  if (pending.length === 0) return

  console.log(`Syncing ${pending.length} offline requests...`)
  const toastId = toast.loading(`Synchronizing ${pending.length} changes...`)

  let successCount = 0
  let failCount = 0

  for (const item of pending) {
    try {
      // Increment attempts
      await db.syncQueue.update(item.id!, { attempts: (item.attempts || 0) + 1 })

      let response
      const payload = item.payload
      
      switch (item.action) {
        case 'created':
          response = await api.post(`/${item.entity_type}`, payload)
          break
        case 'updated':
          response = await api.put(`/${item.entity_type}/${item.entity_id}`, payload)
          break
        case 'deleted':
          response = await api.delete(`/${item.entity_type}/${item.entity_id}`)
          break
      }

      if (response && response.status >= 200 && response.status < 300) {
        await markAsSynced([item.id!])
        successCount++
      } else {
        failCount++
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error)
      failCount++
    }
  }

  if (successCount > 0) {
    toast.success(`Successfully synced ${successCount} changes`, { id: toastId })
    // Dispatch an event so components can refresh their data
    window.dispatchEvent(new CustomEvent('fmis-sync-completed', { detail: { successCount } }))
  } else if (failCount > 0) {
    toast.error(`Failed to sync ${failCount} changes. Will retry later.`, { id: toastId })
  } else {
    toast.dismiss(toastId)
  }
}

export function setupNetworkListeners() {
  window.addEventListener('online', () => {
    console.log('Network is back online. Triggering sync...')
    syncOfflineRequests()
  })

  window.addEventListener('offline', () => {
    console.log('Network connection lost. App is in offline mode.')
    toast('You are offline. Changes will be saved and synced later.', {
      icon: '🌐',
    })
  })
}
