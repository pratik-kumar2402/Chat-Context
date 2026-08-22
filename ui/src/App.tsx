import { useEffect, useState } from 'react'
import './App.css'
import Chat from './components/Chat/Chat'
import ControlPanel from './components/ControlPanel/ControlPanel'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { createGithubMcpClient } from './client/Client'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('context-chat-theme') === 'dark')

  useEffect(() => {
    const callbackParams = new URLSearchParams(window.location.search)
    const code = callbackParams.get('code')
    const state = callbackParams.get('state')

    if (!code || !state) return

    window.history.replaceState({}, document.title, window.location.pathname)

    const completeGithubAuthentication = async () => {
      let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

      try {
        mcpClient = await createGithubMcpClient()
        await mcpClient.callTool('github_callback', { code, state })
      } catch (error) {
        console.error('GitHub authentication callback failed.', error)
      } finally {
        await mcpClient?.close()
      }
    }

    void completeGithubAuthentication()
  }, [])

  const toggleTheme = () => {
    setIsDarkMode((previous) => {
      const nextThemeIsDark = !previous
      localStorage.setItem('context-chat-theme', nextThemeIsDark ? 'dark' : 'light')
      return nextThemeIsDark
    })
  }

  return (
    <div className={`app-shell${isDarkMode ? ' dark-mode' : ''}`}>
      <Navbar isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className="app-main">
        <header className="app-intro">
          <span className="app-eyebrow">Connected knowledge workspace</span>
          <h1>Ask better questions of your sources.</h1>
          <p>Connect a source, retrieve context, and keep the conversation moving.</p>
        </header>

        <section className="workspace-grid" aria-label="Chat workspace">
          <ControlPanel />
          <Chat />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
