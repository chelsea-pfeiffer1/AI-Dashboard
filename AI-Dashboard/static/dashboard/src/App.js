import React from 'react';
import useDashboardData from './hooks/useDashboardData';

function formatTimestamp(value) {
  if (!value) return 'Not refreshed yet';

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('Dashboard render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={pageStyle}>
          <div style={panelStyle}>
            <h1 style={{ marginTop: 0, color: '#fecaca' }}>Dashboard failed to render</h1>
            <p style={{ lineHeight: 1.6 }}>
              The app crashed while rendering. The browser console should show the first useful error.
            </p>
            <pre style={preStyle}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function MiniCard({ label, value }) {
  return (
    <div style={cardStyle}>
      <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 800, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}

export default function App() {
  const {
    loading,
    error,
    config,
    dashboard,
    refresh,
    releaseOptions,
    teamOptions,
    confluenceSpaceOptions,
    viewOptions
  } = useDashboardData();

  const summary = dashboard?.summary || {};
  const metrics = dashboard?.metrics || {};
  const sourceLinks = dashboard?.sourceLinks || {};
  const records = Array.isArray(dashboard?.records) ? dashboard.records : [];
  const workstreams = Array.isArray(dashboard?.workstreams) ? dashboard.workstreams : [];

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={panelStyle}>
          <h1 style={{ marginTop: 0, color: '#f8fafc' }}>AI Dashboard</h1>
          <p style={{ color: '#94a3b8' }}>Loading live Jira, Confluence, and AI data...</p>
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <div style={pageStyle}>
        <div style={shellStyle}>
          <header style={{ marginBottom: 24 }}>
            <div style={eyebrowStyle}>Executive PMO Intelligence Dashboard</div>
            <h1 style={{ margin: '6px 0 0', fontSize: 36, color: '#f8fafc' }}>AI Dashboard</h1>
            <div style={{ marginTop: 10, color: '#cbd5e1', lineHeight: 1.6 }}>
              Release <strong>{dashboard?.scope?.releaseId || config?.releaseId || 'Unknown'}</strong> for team{' '}
              <strong>{dashboard?.scope?.team || config?.team || 'Unknown'}</strong>
              {' '}in Confluence space <strong>{dashboard?.scope?.confluenceSpaceKey || config?.confluenceSpaceKey || 'Unknown'}</strong>
              {' '}| refreshed {formatTimestamp(summary.refreshedAt)}
            </div>
          </header>

          {error ? (
            <div style={errorStyle}>
              <strong>Live data unavailable</strong>
              <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{error}</div>
            </div>
          ) : null}

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Scope</h2>
            <div style={gridStyle}>
              <MiniCard label="Release" value={config?.releaseId || 'Unknown'} />
              <MiniCard label="Team" value={config?.team || 'Unknown'} />
              <MiniCard label="Confluence" value={config?.confluenceSpaceKey || 'Unknown'} />
              <MiniCard label="View" value={config?.view || 'Executive'} />
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => refresh({}, { showLoading: true })} style={primaryButtonStyle}>
                Refresh
              </button>
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Metrics</h2>
            <div style={gridStyle}>
              <MiniCard label="High risk" value={metrics.highRisk ?? 0} />
              <MiniCard label="Medium risk" value={metrics.mediumRisk ?? 0} />
              <MiniCard label="Blockers" value={metrics.blockers ?? 0} />
              <MiniCard label="Decisions needed" value={metrics.decisionsNeeded ?? 0} />
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Source Status</h2>
            <div style={sourceBoxStyle}>
              <div><strong>Jira</strong></div>
              <div>Endpoint: {sourceLinks.jira?.endpoint || 'Not available'}</div>
              <div>JQL: {sourceLinks.jira?.jql || 'Not available'}</div>
              <div>Refresh: {formatTimestamp(sourceLinks.jira?.lastRefresh)}</div>
            </div>
            <div style={sourceBoxStyle}>
              <div><strong>Confluence</strong></div>
              <div>Endpoint: {sourceLinks.confluence?.endpoint || 'Not available'}</div>
              <div>CQL: {sourceLinks.confluence?.cql || 'Not available'}</div>
              <div>Refresh: {formatTimestamp(sourceLinks.confluence?.lastRefresh)}</div>
            </div>
            <div style={sourceBoxStyle}>
              <div><strong>OpenAI</strong></div>
              <div>Endpoint: {sourceLinks.openai?.endpoint || 'Not available'}</div>
              <div>Model: {sourceLinks.openai?.model || 'Not available'}</div>
              <div>Refresh: {formatTimestamp(sourceLinks.openai?.lastRefresh)}</div>
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Executive Summary</h2>
            <div style={summaryStyle}>
              {dashboard?.aiSummary || 'No AI summary returned yet.'}
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Workstreams</h2>
            <pre style={preStyle}>
              {JSON.stringify(workstreams.slice(0, 10), null, 2)}
            </pre>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Top Issues</h2>
            <pre style={preStyle}>
              {JSON.stringify(records.slice(0, 8), null, 2)}
            </pre>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Options</h2>
            <pre style={preStyle}>
              {JSON.stringify(
                {
                  releases: releaseOptions,
                  teams: teamOptions,
                  confluenceSpaces: confluenceSpaceOptions,
                  views: viewOptions
                },
                null,
                2
              )}
            </pre>
          </section>
        </div>
      </div>
    </AppErrorBoundary>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: 24,
  background: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
  color: '#e2e8f0',
  fontFamily: 'Arial, sans-serif'
};

const shellStyle = {
  maxWidth: 1400,
  margin: '0 auto'
};

const panelStyle = {
  background: 'rgba(15, 23, 42, 0.88)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: 16,
  padding: 20
};

const sectionStyle = {
  ...panelStyle,
  marginBottom: 18
};

const sectionTitleStyle = {
  margin: '0 0 12px',
  fontSize: 18,
  color: '#f8fafc'
};

const eyebrowStyle = {
  color: '#94a3b8',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14
};

const cardStyle = {
  borderRadius: 12,
  padding: 16,
  background: 'rgba(2, 6, 23, 0.4)',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  minHeight: 92
};

const sourceBoxStyle = {
  borderRadius: 12,
  padding: 14,
  background: 'rgba(2, 6, 23, 0.35)',
  border: '1px solid rgba(148, 163, 184, 0.12)',
  color: '#cbd5e1',
  lineHeight: 1.6,
  marginBottom: 12
};

const summaryStyle = {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.7,
  color: '#e2e8f0'
};

const preStyle = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  padding: 14,
  borderRadius: 12,
  background: 'rgba(2, 6, 23, 0.4)',
  border: '1px solid rgba(148, 163, 184, 0.12)',
  color: '#cbd5e1'
};

const errorStyle = {
  marginBottom: 18,
  borderRadius: 12,
  border: '1px solid rgba(248, 113, 113, 0.3)',
  background: 'rgba(127, 29, 29, 0.35)',
  color: '#fecaca',
  padding: '14px 16px'
};

const primaryButtonStyle = {
  minHeight: 40,
  borderRadius: 10,
  border: '1px solid rgba(45, 212, 191, 0.45)',
  background: '#0f766e',
  color: '#ecfeff',
  padding: '0 16px',
  cursor: 'pointer',
  fontWeight: 700
};