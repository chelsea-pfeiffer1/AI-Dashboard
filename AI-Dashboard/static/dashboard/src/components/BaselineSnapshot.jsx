import React from 'react';

export default function BaselineSnapshot({ dashboard }) {
  const baseline = dashboard?.baselineSnapshot || {};

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
        Baseline Snapshot
      </div>
      <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
        Source system: {baseline.sourceSystem || 'Unknown'}
        <br />
        Pages loaded: {baseline.pages ?? 0}
      </div>
    </section>
  );
}