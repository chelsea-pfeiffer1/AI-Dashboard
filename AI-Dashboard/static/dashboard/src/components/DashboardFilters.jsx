import React from 'react';

function FieldLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

export default function DashboardFilters({
  refresh,
  dashboard,
}) {

  return (
    <section
      style={{
        marginBottom: 24,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.72)',
        padding: 16,
        boxShadow: '0 16px 30px rgba(15, 23, 42, 0.24)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
            Live dashboard settings
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Live source: Jira{dashboard?.sourceLinks?.confluence ? ' and Confluence' : ''}
          </div>
        </div>

        <button
          type="button"
          onClick={() => refresh()}
          style={{
            minHeight: 40,
            borderRadius: 10,
            border: '1px solid rgba(59, 130, 246, 0.5)',
            background: '#2563eb',
            color: '#fff',
            padding: '0 16px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          <FieldLabel>Release</FieldLabel>
          <div style={{ fontSize: 14, color: '#e2e8f0' }}>
            VMS v26.06.00 (GA: 7/30)
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          <FieldLabel>Confluence Space</FieldLabel>
          <div style={{ fontSize: 14, color: '#e2e8f0' }}>
            Locked to a single configured space
          </div>
        </div>
      </div>
    </section>
  );
}