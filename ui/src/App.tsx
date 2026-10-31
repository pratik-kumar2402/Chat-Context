import { useEffect, useState } from 'react'
import './App.css'
import Chat from './components/Chat/Chat'
import ControlPanel from './components/ControlPanel/ControlPanel'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { createGithubMcpClient, createGoogleDriveMcpClient } from './client/Client'
import { logger } from './client/logger'

function getSavedTheme(): boolean {
  try {
    return localStorage.getItem('context-chat-theme') === 'dark'
  } catch (error) {
    logger.warn('Saved theme could not be loaded', { error })
    return false
  }
}

function getAuthenticationCallbackError(): string {
  const callbackPath = window.location.pathname
  const isGoogleCallback = callbackPath.endsWith('/callback/google')
  const isGithubCallback = callbackPath.endsWith('/callback')
  if (!isGoogleCallback && !isGithubCallback) return ''

  const callbackParams = new URLSearchParams(window.location.search)
  const callbackError = callbackParams.get('error_description') ?? callbackParams.get('error')
  if (callbackError) return callbackError
  if (!callbackParams.get('code') || !callbackParams.get('state')) {
    return `${isGoogleCallback ? 'Google' : 'GitHub'} OAuth callback did not include a code and state.`
  }

  return ''
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(getSavedTheme)
  const [isRetrieving, setIsRetrieving] = useState(false)
  const [authenticationError, setAuthenticationError] = useState(getAuthenticationCallbackError)

  useEffect(() => {
    const callbackParams = new URLSearchParams(window.location.search)
    const code = callbackParams.get('code')
    const state = callbackParams.get('state')
    const isGoogleDriveCallback = window.location.pathname.endsWith('/callback/google')

    if (isGoogleDriveCallback) {
      const callbackError = callbackParams.get('error_description') ?? callbackParams.get('error')
      window.history.replaceState({}, document.title, window.location.pathname)
      if (callbackError || !code || !state) return

      const completeGoogleDriveAuthentication = async () => {
        let mcpClient: Awaited<ReturnType<typeof createGoogleDriveMcpClient>> | undefined
        try {
          logger.info('Google Drive callback handling started')
          mcpClient = await createGoogleDriveMcpClient()
          await mcpClient.completeAuthentication(code, state)
          window.dispatchEvent(new Event('google-drive-connection-changed'))
          logger.info('Google Drive callback handling succeeded')
        } catch (error) {
          logger.error('Google Drive callback handling failed', error)
          setAuthenticationError(error instanceof Error ? error.message : 'Google Drive authentication callback failed.')
        } finally {
          await mcpClient?.close()
        }
      }

      void completeGoogleDriveAuthentication()
      return
    }

    if (!code || !state) return

    window.history.replaceState({}, document.title, window.location.pathname)

    const completeGithubAuthentication = async () => {
      let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

      try {
        logger.info('GitHub callback handling started')
        mcpClient = await createGithubMcpClient()
        await mcpClient.callTool('github_callback', { code, state })
        window.dispatchEvent(new Event('github-connection-changed'))
        logger.info('GitHub callback handling succeeded')
      } catch (error) {
        logger.error('GitHub callback handling failed', error)
        setAuthenticationError(error instanceof Error ? error.message : 'GitHub authentication callback failed.')
      } finally {
        await mcpClient?.close()
      }
    }

    void completeGithubAuthentication()
  }, [])

  const toggleTheme = () => {
    setIsDarkMode((previous) => {
      const nextThemeIsDark = !previous
      try {
        localStorage.setItem('context-chat-theme', nextThemeIsDark ? 'dark' : 'light')
      } catch (error) {
        logger.warn('Theme preference could not be saved', { error })
      }
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
          <ControlPanel
            onRetrievalChange={setIsRetrieving}
            authenticationError={authenticationError}
            onAuthenticationErrorClear={() => setAuthenticationError('')}
          />
          <Chat isRetrieving={isRetrieving} />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
