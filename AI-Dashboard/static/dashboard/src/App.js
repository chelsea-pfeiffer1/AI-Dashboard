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

function formatConfluenceType(item) {
  if (item?.type === 'page' && item?.subtype === 'live') {
    return 'Live doc';
  }

  const labels = {
    page: 'Page',
    folder: 'Folder',
    database: 'Database',
    embed: 'Smart link',
    whiteboard: 'Whiteboard'
  };
  return labels[item?.type] || 'Content';
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
            <h1 style={{ marginTop: 0, color: '#ae2a19' }}>Dashboard failed to render</h1>
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
      <div style={{ color: '#626f86', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ color: '#172b4d', fontSize: 28, fontWeight: 800, marginTop: 8 }}>
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
  const confluenceItems = Array.isArray(dashboard?.confluenceItems) ? dashboard.confluenceItems : [];

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={panelStyle}>
          <h1 style={{ marginTop: 0, color: '#172b4d' }}>AI Dashboard</h1>
          <p style={{ color: '#626f86' }}>Loading live Jira, Confluence, and AI data...</p>
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
            <h1 style={{ margin: '6px 0 0', fontSize: 36, color: '#172b4d' }}>AI Dashboard</h1>
            <div style={{ marginTop: 10, color: '#44546f', lineHeight: 1.6 }}>
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
              <div>Page: {sourceLinks.confluence?.pageTitle || 'Parlevel'}</div>
              <div>Endpoint: {sourceLinks.confluence?.endpoint || 'Not available'}</div>
              <div>Nested content items: {sourceLinks.confluence?.itemCount ?? confluenceItems.length}</div>
              {sourceLinks.confluence?.pageUrl ? (
                <div>
                  <a href={sourceLinks.confluence.pageUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>
                    Open Confluence page
                  </a>
                </div>
              ) : null}
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
            <h2 style={sectionTitleStyle}>Confluence Sources</h2>
            <div style={{ color: '#44546f', marginBottom: 14, lineHeight: 1.6 }}>
              Live content nested beneath the Parlevel page. Each entry opens its exact source in Confluence.
            </div>
            <div style={contentTreeStyle}>
              {confluenceItems.length > 0 ? confluenceItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  style={{
                    ...contentItemStyle,
                    marginLeft: Math.min(Number(item.depth || 0), 6) * 18
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#172b4d' }}>{item.title || 'Untitled'}</div>
                    <div style={{ color: '#626f86', fontSize: 12, marginTop: 3 }}>
                      {formatConfluenceType(item)} · ID {item.id}
                    </div>
                  </div>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>
                      Open
                    </a>
                  ) : (
                    <span style={{ color: '#8993a4', fontSize: 13 }}>Link unavailable</span>
                  )}
                </div>
              )) : (
                <div style={emptyStateStyle}>No nested Confluence content was returned.</div>
              )}
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
  background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
  color: '#172b4d',
  fontFamily: 'Arial, sans-serif'
};

const shellStyle = {
  maxWidth: 1400,
  margin: '0 auto'
};

const panelStyle = {
  background: '#ffffff',
  border: '1px solid #dfe1e6',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 2px 8px rgba(9, 30, 66, 0.08)'
};

const sectionStyle = {
  ...panelStyle,
  marginBottom: 18
};

const sectionTitleStyle = {
  margin: '0 0 12px',
  fontSize: 18,
  color: '#172b4d'
};

const eyebrowStyle = {
  color: '#626f86',
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
  background: '#f7f8f9',
  border: '1px solid #dfe1e6',
  minHeight: 92
};

const sourceBoxStyle = {
  borderRadius: 12,
  padding: 14,
  background: '#f7f8f9',
  border: '1px solid #dfe1e6',
  color: '#44546f',
  lineHeight: 1.6,
  marginBottom: 12
};

const summaryStyle = {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.7,
  color: '#172b4d'
};

const sourceLinkStyle = {
  color: '#0c66e4',
  fontWeight: 700,
  whiteSpace: 'nowrap'
};

const contentTreeStyle = {
  display: 'grid',
  gap: 8
};

const contentItemStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 14px',
  border: '1px solid #dfe1e6',
  borderRadius: 10,
  background: '#f7f8f9'
};

const emptyStateStyle = {
  padding: 16,
  border: '1px dashed #b3b9c4',
  borderRadius: 10,
  color: '#626f86',
  background: '#f7f8f9'
};

const preStyle = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  padding: 14,
  borderRadius: 12,
  background: '#f7f8f9',
  border: '1px solid #dfe1e6',
  color: '#172b4d'
};

const errorStyle = {
  marginBottom: 18,
  borderRadius: 12,
  border: '1px solid #f15b50',
  background: '#fff1f0',
  color: '#ae2a19',
  padding: '14px 16px'
};

const primaryButtonStyle = {
  minHeight: 40,
  borderRadius: 10,
  border: '1px solid #0c66e4',
  background: '#0c66e4',
  color: '#ffffff',
  padding: '0 16px',
  cursor: 'pointer',
  fontWeight: 700
};
