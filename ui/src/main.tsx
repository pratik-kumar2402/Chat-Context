import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { logger } from './client/logger'

window.addEventListener('error', (event) => {
  logger.error('Uncaught browser error', event.error ?? event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
