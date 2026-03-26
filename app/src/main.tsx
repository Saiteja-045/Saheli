import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
<<<<<<< HEAD
    <AuthProvider>
      <App />
    </AuthProvider>
=======
    <LanguageProvider>
      <AuthProvider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </AuthProvider>
    </LanguageProvider>
>>>>>>> 6cd127775d3326dac72f1b349e2afe7f4ac32378
  </StrictMode>,
)
