import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#2a221c',
              color: '#e8dfd6',
              border: '1px solid rgba(61, 51, 44, 0.8)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#2a221c' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#2a221c' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
