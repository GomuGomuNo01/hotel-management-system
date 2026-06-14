import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import App from './App.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { initMonitoring } from './lib/monitoring.js';
import './index.css';

// Active Sentry uniquement si un DSN est configuré (sinon no-op total).
initMonitoring();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster
      position="top-right"
      containerStyle={{ top: 80 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#333',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          paddingRight: '40px',
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '16px',
                  lineHeight: 1,
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#333'; e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'none'; }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  </React.StrictMode>
);
