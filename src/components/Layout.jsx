import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import './Layout.css'

function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  return stored === 'light' || stored === 'dark' ? stored : null
}

function Layout() {
  const [theme, setTheme] = useState(getInitialTheme)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isWide = location.pathname.startsWith('/topic/') || location.pathname.startsWith('/teacher/')
  const wide = isWide ? ' container--wide' : ''

  const goBack = () => {
    if (location.key === 'default') {
      navigate('/')
    } else {
      navigate(-1)
    }
  }

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('theme')
    }
  }, [theme])

  const toggleTheme = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const current = theme ?? (prefersDark ? 'dark' : 'light')
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="layout">
      <header className="site-header">
        <div className={`container site-header__inner${wide}`}>
          <span className="brand">MLX Studio</span>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Home
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              About
            </NavLink>
            <NavLink to="/topic/linear-regression" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Linear regression
            </NavLink>
            <NavLink to="/topic/k-means" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              K-means
            </NavLink>
            <NavLink to="/topic/gradient-descent" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Gradient descent
            </NavLink>
            <NavLink to="/teacher" className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Teacher mode
            </NavLink>
          </nav>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme">
            {(theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {!isHome && (
        <div className={`container back-bar${wide}`}>
          <button type="button" className="back-button" onClick={goBack}>
            Back
          </button>
        </div>
      )}

      <main className={`site-main container${wide}`}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>Built with Vite + React</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
