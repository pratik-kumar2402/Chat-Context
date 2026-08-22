import './Navbar.css'

type NavbarProps = {
  isDarkMode: boolean
  onToggleTheme: () => void
}

function Navbar({ isDarkMode, onToggleTheme }: NavbarProps) {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <a className="brand-mark" href="/">
        <span className="brand-mark-icon">✦</span>
        <span>Context Chat</span>
      </a>
      <div className="nav-status">
        <span className="status-dot" aria-hidden="true" />
        <span>Workspace ready</span>
      </div>
      <button
        className="theme-toggle"
        type="button"
        onClick={onToggleTheme}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        aria-pressed={isDarkMode}
      >
        <span aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
        <span>{isDarkMode ? 'Light' : 'Dark'}</span>
      </button>
    </nav>
  )
}

export default Navbar
