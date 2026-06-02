import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App.jsx'
import './index.css'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={clerkKey}
        appearance={{ variables: { colorPrimary: '#f43f5e' } }}
      >
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
