import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './Chat.css'

type ChatMessage = {
  id: number
  sender: 'user' | 'bot'
  text: string
  time: string
}

function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! Type a message and press Send to start chatting.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((previous) => [
      ...previous,
      { id: Date.now(), sender: 'user', text: trimmed, time: timestamp },
    ])
    setInputValue('')

    window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now(),
          sender: 'bot',
          text: `You said: "${trimmed}". This is a sample chat response.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 500)
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
                <span>{message.text}</span>
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
          placeholder="Type your message..."
        />
        <button type="submit" className="chat-send-button">Send</button>
      </form>
    </section>
  )
}

export default Chat
