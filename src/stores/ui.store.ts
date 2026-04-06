import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  sidebarOpen: boolean
  theme: Theme
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
}

export const useUIStore = create<UIState>()(set => ({
  sidebarOpen: false,
  theme: 'light',
  setSidebarOpen: open => set({ sidebarOpen: open }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: theme => {
    set({ theme })
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }
    localStorage.setItem('caixinha-theme', theme)
  },
}))

// Inicializar tema a partir do localStorage
const savedTheme = localStorage.getItem('caixinha-theme') as Theme | null
if (savedTheme) {
  const root = document.documentElement
  if (savedTheme === 'dark') root.classList.add('dark')
}
