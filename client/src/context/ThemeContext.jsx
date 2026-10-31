import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'docmind-theme'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'

const ThemeContext = createContext(null)

const getStoredTheme = () => {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return ['system', 'light', 'dark'].includes(storedTheme) ? storedTheme : 'system'
}

const getSystemTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERY)
    const handleChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.themePreference = theme
  }, [resolvedTheme, theme])

  const value = useMemo(() => ({
    theme,
    setTheme,
    resolvedTheme
  }), [theme, resolvedTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
