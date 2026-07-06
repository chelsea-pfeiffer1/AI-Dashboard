import React from 'react';

export default function ExecutiveTakeaway({ dashboard }) {
  const metrics = dashboard?.metrics || {};
  const total = dashboard?.summary?.total ?? 0;

  let message = 'No live data is available yet.';
  if (total > 0) {
    if ((metrics.highRisk ?? 0) > 0 || (metrics.blockers ?? 0) > 0) {
      message = 'The release has active risk and blocking work that needs executive attention.';
    } else if ((metrics.decisionsNeeded ?? 0) > 0) {
      message = 'The release is moving, but there are open decisions that should be resolved soon.';
    } else {
      message = 'The release appears stable, with no major risk signals in the current dataset.';
    }
  }

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
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
        Executive Takeaway
      </div>
      <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>{message}</div>
    </section>
  );
}