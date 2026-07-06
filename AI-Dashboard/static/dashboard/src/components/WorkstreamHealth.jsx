import React from 'react';

export default function WorkstreamHealth({ dashboard }) {
  const workstreams = Array.isArray(dashboard?.workstreams) ? dashboard.workstreams : [];

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
        Workstream Health
      </div>

      {workstreams.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>No grouped workstreams are available yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {workstreams.map((workstream) => (
            <div
              key={workstream.name}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 2fr) repeat(3, minmax(80px, 1fr))',
                gap: 12,
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.8)',
              }}
            >
              <div style={{ color: '#f8fafc', fontWeight: 600 }}>{workstream.name}</div>
              <div style={{ color: '#cbd5e1' }}>Total: {workstream.total ?? 0}</div>
              <div style={{ color: '#cbd5e1' }}>Blocked: {workstream.blocked ?? 0}</div>
              <div style={{ color: '#cbd5e1' }}>High risk: {workstream.highRisk ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}