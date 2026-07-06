import React from 'react';

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 14,
        background: 'rgba(15, 23, 42, 0.72)',
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>{value}</div>
    </div>
  );
}

export default function DashboardMetrics({ dashboard }) {
  const metrics = dashboard?.metrics || {};

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <MetricCard label="High Risk" value={metrics.highRisk ?? 0} />
      <MetricCard label="Medium Risk" value={metrics.mediumRisk ?? 0} />
      <MetricCard label="Blockers" value={metrics.blockers ?? 0} />
      <MetricCard label="Decisions Needed" value={metrics.decisionsNeeded ?? 0} />
    </section>
  );
}