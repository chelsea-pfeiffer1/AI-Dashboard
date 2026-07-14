import React from 'react';
import useDashboardData from './hooks/useDashboardData';

import DashboardHeader from './components/DashboardHeader';
import DashboardFilters from './components/DashboardFilters';
import DashboardMetrics from './components/DashboardMetrics';
import ExecutiveTakeaway from './components/ExecutiveTakeaway';
import WorkstreamHealth from './components/WorkstreamHealth';
import ExecutiveActions from './components/ExecutiveActions';
import BaselineSnapshot from './components/BaselineSnapshot';
import CommittedScope from './components/CommittedScope';
import ReleaseRisks from './components/ReleaseRisks';
import SourceLinksFooter from './components/SourceLinksFooter';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const {
    loading,
    error,
    config,
    dashboard,
    updateConfig,
    resetConfig,
    refresh,
    releaseOptions,
    confluenceSpaceOptions,
  } = useDashboardData();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
        color: '#e2e8f0',
        fontFamily: 'Arial, sans-serif',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <DashboardHeader dashboard={dashboard} />

        {error ? (
          <div
            style={{
              margin: '16px 0 24px',
              border: '1px solid rgba(248, 113, 113, 0.35)',
              background: 'rgba(127, 29, 29, 0.35)',
              color: '#fecaca',
              borderRadius: 12,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Live data unavailable</div>
              <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{error}</div>
            </div>
            <button
              type="button"
              onClick={refresh}
              style={{
                border: '1px solid rgba(248, 113, 113, 0.45)',
                background: 'transparent',
                color: '#fecaca',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <DashboardFilters
          config={config}
          updateConfig={updateConfig}
          resetConfig={resetConfig}
          refresh={refresh}
          releaseOptions={releaseOptions}
          confluenceSpaceOptions={confluenceSpaceOptions}
          dashboard={dashboard}
        />

        <DashboardMetrics dashboard={dashboard} />

        <ExecutiveTakeaway dashboard={dashboard} />
        <WorkstreamHealth dashboard={dashboard} />
        <ExecutiveActions dashboard={dashboard} />
        <BaselineSnapshot dashboard={dashboard} />
        <CommittedScope dashboard={dashboard} />
        <ReleaseRisks dashboard={dashboard} />
        <SourceLinksFooter links={dashboard.sourceLinks} />
      </div>
    </div>
  );
}