import { useState } from 'react'
import { createGithubMcpClient } from '../../client/Client'
import type { GithubAllowedFile, GithubRepository } from '../../client/clients/GithubMcpClient'
import './ControlPanel.css'

function ControlPanel() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [repositories, setRepositories] = useState<GithubRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const [allowedFiles, setAllowedFiles] = useState<GithubAllowedFile[]>([])
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isRetrieving, setIsRetrieving] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionError('')

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
      setConnectionError(error instanceof Error ? error.message : 'Unable to connect GitHub.')
      setIsConnecting(false)
    } finally {
      await mcpClient?.close()
    }
  }

  const loadRepositories = async () => {
    if (repositories.length > 0 || isLoadingRepositories) return

    setIsLoadingRepositories(true)
    setConnectionError('')
    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

    try {
      mcpClient = await createGithubMcpClient()
      setRepositories(await mcpClient.listRepositories())
    } catch (error) {
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
      setConnectionError(error instanceof Error ? error.message : 'Unable to load repository files.')
    } finally {
      await mcpClient?.close()
      setIsLoadingFiles(false)
    }
  }

  const handleRetrieve = async () => {
    if (!selectedRepository || !selectedFile || isRetrieving) return

    setIsRetrieving(true)
    setConnectionError('')
    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined

    try {
      mcpClient = await createGithubMcpClient()
      const context = await mcpClient.getFileContext(selectedRepository, selectedFile)
      console.log('GitHub file context:', context)
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Unable to retrieve the selected file.')
    } finally {
      await mcpClient?.close()
      setIsRetrieving(false)
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
          onClick={handleConnect}
          disabled={isConnecting}
        >
          <span aria-hidden="true">↗</span>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
        <label className="control-field">
          <span>Repository</span>
          <select
            value={selectedRepository}
            onFocus={loadRepositories}
            onChange={(event) => void handleRepositoryChange(event.target.value)}
            disabled={isLoadingRepositories}
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
            disabled={!selectedRepository || isLoadingFiles}
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
