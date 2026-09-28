// The theme choice lives in localStorage ('light' or 'dark'; absent means
// follow the system). The inline script in the root layout applies it before
// first paint; these helpers keep the toggle and settings page in sync.

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const CHANGE_EVENT = 'themechange'

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function applyThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Storage can be unavailable (e.g. private mode); the choice still applies to this visit.
  }
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeToThemePreference(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
