import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { createGithubMcpClient } from '../../client/Client'
import { logger } from '../../client/logger'
import './Chat.css'

type ChatMessage = {
  id: number
  sender: 'user' | 'bot'
  text: string
  time: string
}

type ChatProps = {
  isRetrieving: boolean
}

function Chat({ isRetrieving }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! Type a message and press Send to start chatting.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || isRetrieving) return

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((previous) => [
      ...previous,
      { id: Date.now(), sender: 'user', text: trimmed, time: timestamp },
    ])
    setInputValue('')
    setIsSending(true)
    logger.info('Chat action triggered')

    let mcpClient: Awaited<ReturnType<typeof createGithubMcpClient>> | undefined
    try {
      mcpClient = await createGithubMcpClient()
      const result = await mcpClient.askLocalModel(trimmed)
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now(),
          sender: 'bot',
          text: result.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      logger.info('Chat action succeeded')
    } catch (error) {
      logger.error('Chat action failed', error)
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now(),
          sender: 'bot',
          text: error instanceof Error ? error.message : 'Unable to reach the local model.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      await mcpClient?.close()
      setIsSending(false)
    }
  }

  return (
    <section className="chat-app">
      <div className="chat-header">
        <div>
          <h2>Chat Interface</h2>
          <p>Send a message to see the conversation flow.</p>
        </div>
      </div>

      <div className="chat-window">
        <ul className="message-list">
          {messages.map((message) => (
            <li key={message.id} className={`message ${message.sender}`}>
              <div className="message-bubble">
                {message.sender === 'bot' ? <div className="message-markdown"><ReactMarkdown>{message.text}</ReactMarkdown></div> : <span>{message.text}</span>}
                <time>{message.time}</time>
              </div>
            </li>
          ))}
          <div ref={messagesEndRef} />
        </ul>
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          aria-label="Type a message"
          className="chat-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={isRetrieving ? 'Waiting for context retrieval...' : isSending ? 'Waiting for the local model...' : 'Type your message...'}
          disabled={isSending || isRetrieving}
        />
        <button type="submit" className="chat-send-button" disabled={isSending || isRetrieving}>Send</button>
      </form>
    </section>
  )
}

export default Chat
