import React from 'react';

export default function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
        color: '#e2e8f0',
        fontFamily: 'Arial, sans-serif',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '4px solid rgba(148, 163, 184, 0.25)',
            borderTopColor: '#60a5fa',
            animation: 'spin 0.9s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Loading dashboard
        </div>
        <div style={{ color: '#94a3b8', lineHeight: 1.5 }}>
          Fetching live Jira and Confluence data now.
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}