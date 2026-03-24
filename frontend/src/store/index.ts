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
  setUser: (user: User) => void
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
        // Apply branding with global fallbacks from SettingsStore
        const globalSettings = useSettingsStore.getState().settings
        applyBranding(tenant, globalSettings)
      },
      setUser: (user) => set({ user }),
      setTenant: (tenant) => {
        set({ tenant })
        const globalSettings = useSettingsStore.getState().settings
        applyBranding(tenant, globalSettings)
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

// --- PWA Store ---
interface PwaState {
  deferredPrompt: any | null
  isInstallable: boolean
  isInstalled: boolean
  setDeferredPrompt: (prompt: any | null) => void
  setIsInstalled: (isInstalled: boolean) => void
}

export const usePwaStore = create<PwaState>((set) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt, isInstallable: !!deferredPrompt }),
  setIsInstalled: (isInstalled) => set({ isInstalled }),
}))

// --- Theme / Branding ---
export function applyBranding(tenant?: Partial<Tenant> | null, systemSettings?: Record<string, any>): void {
  const root = document.documentElement
  
  const primaryColor = tenant?.primary_color || systemSettings?.['system.primary_color'] || '#3B82F6'
  const secondaryColor = tenant?.secondary_color || systemSettings?.['system.secondary_color'] || '#0F172A'
  const accentColor = tenant?.accent_color || systemSettings?.['system.accent_color'] || '#10B981'
  const logo = tenant?.logo || systemSettings?.['system.logo']
  const favicon = tenant?.favicon || systemSettings?.['system.favicon']
  const name = tenant?.name || systemSettings?.['system.name'] || 'FMIS'

  root.style.setProperty('--color-primary', primaryColor)
  root.style.setProperty('--color-secondary', secondaryColor)
  root.style.setProperty('--color-accent', accentColor)
  
  // Update PWA theme color meta tag
  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!themeMeta) {
    themeMeta = document.createElement('meta')
    themeMeta.name = 'theme-color'
    document.head.appendChild(themeMeta)
  }
  themeMeta.content = primaryColor

  if (logo) {
    // Update apple-touch-icon for PWA
    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = logo
  }

  if (favicon) {
    const faviconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (faviconEl) faviconEl.href = favicon
  }
  
  document.title = tenant?.name ? `${tenant.name} | ${name}` : name

  // Persist for login page use
  localStorage.setItem('fmis_last_branding', JSON.stringify({
    name,
    logo,
    primary_color: primaryColor,
    accent_color: accentColor
  }))
}
