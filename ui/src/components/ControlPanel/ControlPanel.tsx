import { useEffect, useState } from 'react'
import { createGithubMcpClient, createGoogleDriveMcpClient } from '../../client/Client'
import { logger } from '../../client/logger'
import type { GithubAllowedFile, GithubRepository } from '../../client/clients/GithubMcpClient'
import type { GoogleDriveFile } from '../../client/clients/GoogleDriveMcpClient'
import './ControlPanel.css'

type Source = 'github' | 'google-drive' | 'local'

type ControlPanelProps = {
  onRetrievalChange: (isRetrieving: boolean) => void
}

function ControlPanel({ onRetrievalChange }: ControlPanelProps) {
  const [source, setSource] = useState<Source>(() =>
    window.location.pathname.endsWith('/callback/google') ? 'google-drive' : 'github',
  )
  const [isConnecting, setIsConnecting] = useState(false)
  const [isGithubConnected, setIsGithubConnected] = useState(false)
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false)
  const [isCheckingGithubConnection, setIsCheckingGithubConnection] = useState(true)
  const [isCheckingGoogleDriveConnection, setIsCheckingGoogleDriveConnection] = useState(true)
  const [connectionError, setConnectionError] = useState('')
  const [repositories, setRepositories] = useState<GithubRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const [allowedFiles, setAllowedFiles] = useState<GithubAllowedFile[]>([])
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
  const [selectedDriveFile, setSelectedDriveFile] = useState('')
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false)
  const [localFiles, setLocalFiles] = useState<File[]>([])
  const [isRetrieving, setIsRetrieving] = useState(false)
  const [retrievalStatus, setRetrievalStatus] = useState('')

  const isConnected = source === 'github'
    ? isGithubConnected
    : source === 'google-drive' && isGoogleDriveConnected
  const isCheckingConnection = source === 'github'
    ? isCheckingGithubConnection
    : source === 'google-drive' && isCheckingGoogleDriveConnection

  useEffect(() => {
    const checkGithubConnection = async () => {
      let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

      try {
        mcpClient = await createGithubMcpClient()
        await mcpClient.getProfile()
        setIsGithubConnected(true)
        logger.info('GitHub connection check succeeded')
      } catch {
        setIsGithubConnected(false)
        logger.info('GitHub connection check found no active connection')
      } finally {
        await mcpClient?.close()
        setIsCheckingGithubConnection(false)
      }
    }

    const checkGoogleDriveConnection = async () => {
      let mcpClient: Awaited<ReturnType<typeof createGoogleDriveMcpClient>> | undefined

      try {
        mcpClient = await createGoogleDriveMcpClient()
        setIsGoogleDriveConnected(await mcpClient.isConnected())
      } catch (error) {
        setIsGoogleDriveConnected(false)
        logger.error('Google Drive connection check failed', error)
      } finally {
        await mcpClient?.close()
        setIsCheckingGoogleDriveConnection(false)
      }
    }

    void checkGithubConnection()
    void checkGoogleDriveConnection()

    // OAuth returns to this page after the callback completes in the parent component.
    const handleGithubConnectionChange = () => void checkGithubConnection()
    const handleGoogleDriveConnectionChange = () => void checkGoogleDriveConnection()
    const handleGoogleDriveConnectionError = (event: Event) => {
      const callbackError = (event as CustomEvent<string>).detail
      setConnectionError(callbackError || 'Google Drive authentication failed.')
    }
    window.addEventListener('github-connection-changed', handleGithubConnectionChange)
    window.addEventListener('google-drive-connection-changed', handleGoogleDriveConnectionChange)
    window.addEventListener('google-drive-connection-error', handleGoogleDriveConnectionError)
    return () => {
      window.removeEventListener('github-connection-changed', handleGithubConnectionChange)
      window.removeEventListener('google-drive-connection-changed', handleGoogleDriveConnectionChange)
      window.removeEventListener('google-drive-connection-error', handleGoogleDriveConnectionError)
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionError('')
    try {
      if (source === 'github') {
        logger.info('GitHub connect action triggered')
        const mcpClient = await createGithubMcpClient()
        try {
          const result = await mcpClient.callTool('github_authenticate')
          const authorizationUrl = result.content.find(
            (item): item is { type: 'text'; text: string } =>
              item.type === 'text' && typeof item.text === 'string',
          )?.text.match(/https:\/\/github\.com\/login\/oauth\/authorize\?\S+/)?.[0]

          if (!authorizationUrl) throw new Error('GitHub authorization URL was not returned by the MCP server.')
          window.location.assign(authorizationUrl)
        } finally {
          await mcpClient.close()
        }
      } else if (source === 'google-drive') {
        logger.info('Google Drive connect action triggered')
        const mcpClient = await createGoogleDriveMcpClient()
        try {
          window.location.assign(await mcpClient.getAuthorizationUrl())
        } finally {
          await mcpClient.close()
        }
      }
    } catch (error) {
      logger.error(`${source} connect action failed`, error)
      setConnectionError(error instanceof Error ? error.message : `Unable to connect ${source}.`)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsConnecting(true)
    setConnectionError('')
    try {
      if (source === 'github') {
        const mcpClient = await createGithubMcpClient()
        try {
          await mcpClient.disconnect()
          setIsGithubConnected(false)
          setRepositories([])
          setAllowedFiles([])
          setSelectedRepository('')
          setSelectedFile('')
          logger.info('GitHub disconnect action succeeded')
        } finally {
          await mcpClient.close()
        }
      } else if (source === 'google-drive') {
        const mcpClient = await createGoogleDriveMcpClient()
        try {
          await mcpClient.disconnect()
          setIsGoogleDriveConnected(false)
          setDriveFiles([])
          setSelectedDriveFile('')
          logger.info('Google Drive disconnect action succeeded')
        } finally {
          await mcpClient.close()
        }
      }
    } catch (error) {
      logger.error(`${source} disconnect action failed`, error)
      setConnectionError(error instanceof Error ? error.message : `Unable to disconnect ${source}.`)
    } finally {
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
        setIsGithubConnected(false)
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
        setIsGithubConnected(false)
        setSelectedRepository('')
        setAllowedFiles([])
      }
      setConnectionError(error instanceof Error ? error.message : 'Unable to load repository files.')
    } finally {
      await mcpClient?.close()
      setIsLoadingFiles(false)
    }
  }

  const loadDriveFiles = async () => {
    if (!isGoogleDriveConnected || driveFiles.length > 0 || isLoadingDriveFiles) return

    setIsLoadingDriveFiles(true)
    setConnectionError('')
    let mcpClient: Awaited<ReturnType<typeof createGoogleDriveMcpClient>> | undefined

    try {
      mcpClient = await createGoogleDriveMcpClient()
      setDriveFiles(await mcpClient.listFiles())
    } catch (error) {
      if (error instanceof Error && error.message.includes('Google Drive is not connected')) {
        setIsGoogleDriveConnected(false)
        setDriveFiles([])
      }
      setConnectionError(error instanceof Error ? error.message : 'Unable to load Google Drive files.')
    } finally {
      await mcpClient?.close()
      setIsLoadingDriveFiles(false)
    }
  }

  const handleRetrieve = async () => {
    const hasSelection = source === 'github'
      ? Boolean(selectedRepository && selectedFile)
      : source === 'google-drive'
        ? Boolean(selectedDriveFile)
        : localFiles.length > 0
    if (!hasSelection || isRetrieving) return

    setIsRetrieving(true)
    onRetrievalChange(true)
    setConnectionError('')
    setRetrievalStatus('')
    logger.info('Retrieve action triggered', { source })

    try {
      if (source === 'github') {
        const mcpClient = await createGithubMcpClient()
        try {
          const context = await mcpClient.getFileContext(selectedRepository, selectedFile)
          await mcpClient.ingestFileContext(selectedRepository, selectedFile, context.content)
        } finally {
          await mcpClient.close()
        }
      } else if (source === 'google-drive') {
        const mcpClient = await createGoogleDriveMcpClient()
        try {
          const context = await mcpClient.getFileContext(selectedDriveFile)
          await mcpClient.ingestFileContext(context.name, context.content)
        } finally {
          await mcpClient.close()
        }
      } else {
        const mcpClient = await createGithubMcpClient()
        try {
          const tools = await mcpClient.listTools()
          if (!tools.some((tool) => tool.name === 'ingest_local_file_context')) {
            throw new Error('The MCP server is out of date and does not support local file ingestion. Restart the MCP server to load the latest tools.')
          }

          for (const file of localFiles) {
            const content = await file.text()
            if (!content.trim()) {
              throw new Error(`The selected file is empty: ${file.name}`)
            }

            await mcpClient.callTool('ingest_local_file_context', {
              fileName: file.name,
              content,
            })
          }
          setRetrievalStatus(`Indexed ${localFiles.length} local file${localFiles.length === 1 ? '' : 's'} successfully. You can now ask questions about ${localFiles.length === 1 ? 'it' : 'them'}.`)
        } finally {
          await mcpClient.close()
        }
      }
      logger.info('Retrieve action succeeded', { source })
    } catch (error) {
      logger.error('Retrieve action failed', error)
      setConnectionError(error instanceof Error ? error.message : 'Unable to retrieve the selected file.')
    } finally {
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
          <select value={source} onChange={(event) => {
            const nextSource = event.target.value
            setSource(nextSource === 'google-drive' || nextSource === 'local' ? nextSource : 'github')
            setConnectionError('')
            setRetrievalStatus('')
          }}>
            <option value="github">GitHub</option>
            <option value="google-drive">Google Drive</option>
            <option value="local">Local</option>
          </select>
        </label>
        {source !== 'local' && <button
          className="control-button primary"
          type="button"
          onClick={() => void (isConnected ? handleDisconnect() : handleConnect())}
          disabled={isConnecting || isCheckingConnection}
        >
          <span aria-hidden="true">{isConnected ? '↙' : '↗'}</span>
          {isConnecting
            ? (isConnected ? 'Disconnecting...' : 'Connecting...')
            : `${isConnected ? 'Disconnect from' : 'Connect to'} ${source === 'github' ? 'GitHub' : 'Google Drive'}`}
        </button>}
        {source === 'github' ? (
          <>
            <label className="control-field">
              <span>Repository</span>
              <select
                value={selectedRepository}
                onFocus={() => void loadRepositories()}
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
          </>
        ) : source === 'google-drive' ? (
          <label className="control-field">
            <span>Google Drive file</span>
            <select
              value={selectedDriveFile}
              onFocus={() => void loadDriveFiles()}
              onChange={(event) => setSelectedDriveFile(event.target.value)}
              disabled={!isConnected || isCheckingConnection || isLoadingDriveFiles}
            >
              <option value="">{isLoadingDriveFiles ? 'Loading files...' : 'Select a Google Doc, .md, or .txt file'}</option>
              {driveFiles.map((file) => (
                <option key={file.id} value={file.id}>{file.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="control-field">
            <span>Local files</span>
            <input
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              multiple
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? [])
                const allowedFiles = selectedFiles.filter((file) => /\.(md|txt)$/i.test(file.name))
                setLocalFiles(allowedFiles)
                setRetrievalStatus('')
                setConnectionError(
                  allowedFiles.length === selectedFiles.length
                    ? ''
                    : 'Only .md and .txt files can be retrieved.',
                )
              }}
              disabled={isRetrieving}
            />
            {localFiles.length > 0 && (
              <span aria-live="polite">
                {localFiles.length} file{localFiles.length === 1 ? '' : 's'} selected: {localFiles.map((file) => file.name).join(', ')}
              </span>
            )}
          </label>
        )}
        <button
          className="control-button secondary"
          type="button"
          onClick={() => void handleRetrieve()}
          disabled={source === 'github'
            ? !selectedRepository || !selectedFile || isLoadingRepositories || isRetrieving
            : source === 'google-drive'
              ? !selectedDriveFile || isLoadingDriveFiles || isRetrieving
              : !localFiles.length || isRetrieving}
        >
          <span aria-hidden="true">↻</span>
          {isRetrieving ? 'Retrieving...' : 'Retrieve'}
        </button>
      </div>

      <div className="panel-note">
        <span className="note-icon" aria-hidden="true">i</span>
        <span>{connectionError || retrievalStatus || (source === 'local'
          ? 'Selected files are read in your browser and sent to the local model service for indexing.'
          : 'Retrieved context will appear here when connected.')}</span>
      </div>
    </aside>
  )
}

export default ControlPanel
