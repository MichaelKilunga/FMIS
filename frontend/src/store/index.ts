import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Tenant, Settings } from '../types'

// --- Auth Store ---
interface AuthState {
  user: User | null
  token: string | null
  tenant: Tenant | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, tenant?: Tenant) => void
  setTenant: (tenant: Tenant) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      tenant: null,
      isAuthenticated: false,
      setAuth: (user, token, tenant) => {
        localStorage.setItem('fmis_token', token)
        set({ user, token, tenant, isAuthenticated: true })
        // Apply tenant branding as CSS variables
        if (tenant) applyBranding(tenant)
      },
      setTenant: (tenant) => {
        set({ tenant })
        applyBranding(tenant)
      },
      logout: () => {
        localStorage.removeItem('fmis_token')
        set({ user: null, token: null, tenant: null, isAuthenticated: false })
      },
    }),
    { name: 'fmis-auth', partialize: (s) => ({ user: s.user, token: s.token, tenant: s.tenant, isAuthenticated: s.isAuthenticated }) }
  )
)

// --- Settings Store ---
interface SettingsState {
  settings: Settings
  isLoaded: boolean
  setSettings: (settings: Settings) => void
  getSetting: (key: string, fallback?: unknown) => unknown
  isModuleEnabled: (module: string) => boolean
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoaded: false,
  setSettings: (settings) => set({ settings, isLoaded: true }),
  getSetting: (key, fallback = null) => get().settings[key] ?? fallback,
  isModuleEnabled: (module) => {
    const val = get().settings[`modules.${module}.enabled`]
    return val === undefined ? true : Boolean(val)
  },
}))

// --- Online Status Store ---
interface OnlineState {
  isOnline: boolean
  pendingSyncCount: number
  setOnline: (online: boolean) => void
  setPendingCount: (count: number) => void
}

export const useOnlineStore = create<OnlineState>((set) => ({
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingSyncCount) => set({ pendingSyncCount }),
}))

// --- Theme / Branding ---
export function applyBranding(tenant: Partial<Tenant>): void {
  const root = document.documentElement
  if (tenant.primary_color)   root.style.setProperty('--color-primary', tenant.primary_color)
  if (tenant.secondary_color) root.style.setProperty('--color-secondary', tenant.secondary_color)
  if (tenant.accent_color)    root.style.setProperty('--color-accent', tenant.accent_color)
  if (tenant.favicon) {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) favicon.href = tenant.favicon
  }
  if (tenant.name) document.title = `${tenant.name} | FMIS`
}
