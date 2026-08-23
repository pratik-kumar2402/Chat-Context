import { useEffect, useState } from 'react'
import { createGithubMcpClient } from '../../client/Client'
import { logger } from '../../client/logger'
import type { GithubAllowedFile, GithubRepository } from '../../client/clients/GithubMcpClient'
import './ControlPanel.css'

type ControlPanelProps = {
  onRetrievalChange: (isRetrieving: boolean) => void
}

function ControlPanel({ onRetrievalChange }: ControlPanelProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [repositories, setRepositories] = useState<GithubRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const [allowedFiles, setAllowedFiles] = useState<GithubAllowedFile[]>([])
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isRetrieving, setIsRetrieving] = useState(false)

  useEffect(() => {
    const checkConnection = async () => {
      let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

      try {
        mcpClient = await createGithubMcpClient()
        await mcpClient.getProfile()
        setIsConnected(true)
        logger.info('GitHub connection check succeeded')
      } catch {
        setIsConnected(false)
        logger.info('GitHub connection check found no active connection')
      } finally {
        await mcpClient?.close()
        setIsCheckingConnection(false)
      }
    }

    void checkConnection()

    // OAuth returns to this page after the callback completes in the parent component.
    const handleConnectionChange = () => void checkConnection()
    window.addEventListener('github-connection-changed', handleConnectionChange)
    return () => window.removeEventListener('github-connection-changed', handleConnectionChange)
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionError('')
    logger.info('GitHub connect action triggered')

    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined
    try {
      mcpClient = await createGithubMcpClient()
      const result = await mcpClient.callTool('github_authenticate')

      const authorizationUrl = result.content.find(
        (item): item is { type: 'text'; text: string } =>
          item.type === 'text' && typeof item.text === 'string',
      )?.text.match(/https:\/\/github\.com\/login\/oauth\/authorize\?\S+/)?.[0]

      if (!authorizationUrl) {
        throw new Error('GitHub authorization URL was not returned by the MCP server.')
      }

      window.location.assign(authorizationUrl)
    } catch (error) {
      logger.error('GitHub connect action failed', error)
      setConnectionError(error instanceof Error ? error.message : 'Unable to connect GitHub.')
      setIsConnecting(false)
    } finally {
      await mcpClient?.close()
    }
  }

  const handleDisconnect = async () => {
    setIsConnecting(true)
    setConnectionError('')
    logger.info('GitHub disconnect action triggered')

    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined
    try {
      mcpClient = await createGithubMcpClient()
      await mcpClient.disconnect()
      setIsConnected(false)
      setRepositories([])
      setAllowedFiles([])
      setSelectedRepository('')
      setSelectedFile('')
      logger.info('GitHub disconnect action succeeded')
    } catch (error) {
      logger.error('GitHub disconnect action failed', error)
      setConnectionError(error instanceof Error ? error.message : 'Unable to disconnect GitHub.')
    } finally {
      await mcpClient?.close()
      setIsConnecting(false)
    }
  }

  const loadRepositories = async () => {
    if (!isConnected || repositories.length > 0 || isLoadingRepositories) return

    setIsLoadingRepositories(true)
    setConnectionError('')
    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

    try {
      mcpClient = await createGithubMcpClient()
      setRepositories(await mcpClient.listRepositories())
    } catch (error) {
      if (error instanceof Error && error.message.includes('GitHub is not connected')) {
        setIsConnected(false)
        setRepositories([])
      }
      setConnectionError(error instanceof Error ? error.message : 'Unable to load GitHub repositories.')
    } finally {
      await mcpClient?.close()
      setIsLoadingRepositories(false)
    }
  }

  const handleRepositoryChange = async (repositoryFullName: string) => {
    setSelectedRepository(repositoryFullName)
    setSelectedFile('')
    setAllowedFiles([])
    if (!repositoryFullName) return

    setIsLoadingFiles(true)
    setConnectionError('')
    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

    try {
      mcpClient = await createGithubMcpClient()
      setAllowedFiles(await mcpClient.listAllowedFiles(repositoryFullName))
    } catch (error) {
      if (error instanceof Error && error.message.includes('GitHub is not connected')) {
        setIsConnected(false)
        setSelectedRepository('')
        setAllowedFiles([])
      }
      setConnectionError(error instanceof Error ? error.message : 'Unable to load repository files.')
    } finally {
      await mcpClient?.close()
      setIsLoadingFiles(false)
    }
  }

  const handleRetrieve = async () => {
    if (!selectedRepository || !selectedFile || isRetrieving) return

    setIsRetrieving(true)
    onRetrievalChange(true)
    setConnectionError('')
    logger.info('Retrieve action triggered', { repository: selectedRepository, file: selectedFile })
    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

    try {
      mcpClient = await createGithubMcpClient()
      const context = await mcpClient.getFileContext(selectedRepository, selectedFile)
      console.log('GitHub file context:', context)
      const ingestion = await mcpClient.ingestFileContext(selectedRepository, selectedFile, context.content)
      console.log('GitHub file indexed for model:', ingestion)
      logger.info('Retrieve action succeeded', { repository: selectedRepository, file: selectedFile })
    } catch (error) {
      logger.error('Retrieve action failed', error)
      setConnectionError(error instanceof Error ? error.message : 'Unable to retrieve the selected file.')
    } finally {
      await mcpClient?.close()
      setIsRetrieving(false)
      onRetrievalChange(false)
    }
  }

  return (
    <aside className="control-panel" aria-label="Workspace controls">
      <div className="panel-heading">
        <span className="panel-kicker">Workspace</span>
        <h2>Connect your sources</h2>
        <p>Choose where your context comes from, then retrieve it for the conversation.</p>
      </div>

      <div className="control-fields">
        <label className="control-field">
          <span>Source</span>
          <select defaultValue="github">
            <option value="github">GitHub</option>
          </select>
        </label>
        <button
          className="control-button primary"
          type="button"
          onClick={() => void (isConnected ? handleDisconnect() : handleConnect())}
          disabled={isConnecting || isCheckingConnection}
        >
          <span aria-hidden="true">{isConnected ? '↙' : '↗'}</span>
          {isConnecting ? (isConnected ? 'Disconnecting...' : 'Connecting...') : `${isConnected ? 'Disconnect from' : 'Connect to'} GitHub`}
        </button>
        <label className="control-field">
          <span>Repository</span>
          <select
            value={selectedRepository}
            onFocus={loadRepositories}
            onChange={(event) => void handleRepositoryChange(event.target.value)}
            disabled={!isConnected || isCheckingConnection || isLoadingRepositories}
          >
            <option value="">{isLoadingRepositories ? 'Loading repositories...' : 'Select a repository'}</option>
            {repositories.map((repository) => (
              <option key={repository.id} value={repository.full_name}>{repository.full_name}</option>
            ))}
          </select>
        </label>
        <label className="control-field">
          <span>Allowed file</span>
          <select
            value={selectedFile}
            onChange={(event) => setSelectedFile(event.target.value)}
            disabled={!isConnected || !selectedRepository || isLoadingFiles}
          >
            <option value="">{isLoadingFiles ? 'Loading files...' : 'Select a .md or .txt file'}</option>
            {allowedFiles.map((file) => (
              <option key={file.sha} value={file.path}>{file.path}</option>
            ))}
          </select>
        </label>
        <button className="control-button secondary" type="button" onClick={() => void handleRetrieve()} disabled={!selectedRepository || !selectedFile || isLoadingRepositories || isRetrieving}>
          <span aria-hidden="true">↻</span>
          {isRetrieving ? 'Retrieving...' : 'Retrieve'}
        </button>
      </div>

      <div className="panel-note">
        <span className="note-icon" aria-hidden="true">i</span>
        <span>{connectionError || 'Retrieved context will appear here when connected.'}</span>
      </div>
    </aside>
  )
}

export default ControlPanel
