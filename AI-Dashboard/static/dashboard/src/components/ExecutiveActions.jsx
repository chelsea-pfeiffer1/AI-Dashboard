import React from 'react';

export default function ExecutiveActions({ dashboard }) {
  const actions = Array.isArray(dashboard?.actions) ? dashboard.actions : [];

  return (
    <section
      style={{
        marginBottom: 24,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.72)',
        padding: 18,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>
        Executive Actions
      </div>

      {actions.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>No action items were inferred from the current dataset.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {actions.map((action) => (
            <div
              key={action.issueKey || action.summary}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.8)',
              }}
            >
              <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                {action.issueKey ? `${action.issueKey}: ` : ''}
                {action.summary}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 14, marginTop: 4 }}>
                Owner: {action.owner} | Status: {action.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}