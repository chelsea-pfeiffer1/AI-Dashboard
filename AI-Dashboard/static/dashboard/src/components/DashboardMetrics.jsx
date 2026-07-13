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

function deriveMetrics(records) {
  const highRisk = records.filter((record) => {
    const priority = String(record?.risk?.label || '').toLowerCase();
    const labels = Array.isArray(record?.labels) ? record.labels.map((label) => String(label).toLowerCase()) : [];
    const summary = String(record?.summary || '');
    const status = String(record?.status || '');

    return (
      priority.includes('highest') ||
      priority.includes('critical') ||
      priority.includes('blocker') ||
      labels.includes('blocker') ||
      /critical|blocker/i.test(`${summary} ${status}`)
    );
  }).length;

  const mediumRisk = records.filter((record) => {
    const priority = String(record?.risk?.label || '').toLowerCase();
    const labels = Array.isArray(record?.labels) ? record.labels.map((label) => String(label).toLowerCase()) : [];

    return (
      priority.includes('high') ||
      priority.includes('medium') ||
      labels.includes('high') ||
      labels.includes('medium')
    );
  }).length;

  const blockers = records.filter((record) => {
    const summary = String(record?.summary || '');
    const status = String(record?.status || '');
    return /blocked|blocker/i.test(`${status} ${summary}`);
  }).length;

  const decisionsNeeded = records.filter((record) => {
    const summary = String(record?.summary || '');
    const status = String(record?.status || '');
    return /decision|approve|clarify|confirm/i.test(`${status} ${summary}`);
  }).length;

  return { highRisk, mediumRisk, blockers, decisionsNeeded };
}

export default function DashboardMetrics({ dashboard }) {
  const records =
    Array.isArray(dashboard?.cardData?.metrics?.records) && dashboard.cardData.metrics.records.length > 0
      ? dashboard.cardData.metrics.records
      : Array.isArray(dashboard?.records)
      ? dashboard.records
      : [];

  const metrics = deriveMetrics(records);

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