import React from 'react';

export default function DashboardHeader({ dashboard }) {
  const total = dashboard?.summary?.total ?? 0;
  const visible = dashboard?.summary?.visible ?? 0;
  const refreshedAt = dashboard?.summary?.refreshedAt || 'Not refreshed yet';

  return (
    <header style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
        Executive PMO Intelligence Dashboard
      </div>
      <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1, color: '#f8fafc' }}>
        AI Dashboard
      </h1>
      <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 14 }}>
        {total} total issues, {visible} visible, refreshed {refreshedAt}
      </div>
    </header>
  );
}