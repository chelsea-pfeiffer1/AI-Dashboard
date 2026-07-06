import React from 'react';

export default function CommittedScope({ dashboard }) {
  const scope = dashboard?.committedScope || {};

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
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>
        Committed Scope
      </div>
      <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
        Source system: {scope.sourceSystem || 'Unknown'}
        <br />
        Issues included: {scope.issues ?? 0}
      </div>
    </section>
  );
}