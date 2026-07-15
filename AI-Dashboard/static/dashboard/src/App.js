// import React from 'react';
// import useDashboardData from './hooks/useDashboardData';

// import DashboardHeader from './components/DashboardHeader';
// import DashboardFilters from './components/DashboardFilters';
// import DashboardMetrics from './components/DashboardMetrics';
// import ExecutiveTakeaway from './components/ExecutiveTakeaway';
// import WorkstreamHealth from './components/WorkstreamHealth';
// import ExecutiveActions from './components/ExecutiveActions';
// import BaselineSnapshot from './components/BaselineSnapshot';
// import CommittedScope from './components/CommittedScope';
// import ReleaseRisks from './components/ReleaseRisks';
// import SourceLinksFooter from './components/SourceLinksFooter';
// import LoadingScreen from './components/LoadingScreen';

// export default function App() {
//   const {
//     loading,
//     error,
//     consentAcknowledged,
//     dashboard,
//     refresh,
//   } = useDashboardData();

//   if (loading) {
//     return <LoadingScreen />;
//   }

//   return (
//     <div
//       style={{
//         minHeight: '100vh',
//         background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
//         color: '#e2e8f0',
//         fontFamily: 'Arial, sans-serif',
//         padding: 24,
//       }}
//     >
//       <div style={{ maxWidth: 1600, margin: '0 auto' }}>
//         <DashboardHeader dashboard={dashboard} />

//         <div
//           style={{
//             margin: '16px 0 24px',
//             border: '1px solid rgba(148, 163, 184, 0.3)',
//             background: 'rgba(15, 23, 42, 0.8)',
//             color: '#cbd5e1',
//             borderRadius: 12,
//             padding: '14px 16px',
//             fontSize: 14,
//             lineHeight: 1.5,
//           }}
//         >
//           <div style={{ fontWeight: 700, marginBottom: 4, color: '#f8fafc' }}>
//             Jira connection consent
//           </div>
//           <div>
//             Using this dashboard automatically connects to Jira to read live issue data. By using the dashboard, you consent to that connection and the data access required to render the live view.
//           </div>
//           {consentAcknowledged ? (
//             <div style={{ marginTop: 8, color: '#86efac' }}>Connection initiated automatically.</div>
//           ) : null}
//         </div>

//         {error ? (
//           <div
//             style={{
//               margin: '16px 0 24px',
//               border: '1px solid rgba(248, 113, 113, 0.35)',
//               background: 'rgba(127, 29, 29, 0.35)',
//               color: '#fecaca',
//               borderRadius: 12,
//               padding: '14px 16px',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//               gap: 16,
//             }}
//           >
//             <div style={{ flex: 1 }}>
//               <div style={{ fontWeight: 700, marginBottom: 4 }}>Live data unavailable</div>
//               <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{error}</div>
//             </div>
//             <button
//               type="button"
//               onClick={refresh}
//               style={{
//                 border: '1px solid rgba(248, 113, 113, 0.45)',
//                 background: 'transparent',
//                 color: '#fecaca',
//                 borderRadius: 8,
//                 padding: '8px 12px',
//                 cursor: 'pointer',
//                 whiteSpace: 'nowrap',
//               }}
//             >
//               Retry
//             </button>
//           </div>
//         ) : null}

//         <DashboardFilters refresh={refresh} dashboard={dashboard} />

//         <DashboardMetrics dashboard={dashboard} />

//         <ExecutiveTakeaway dashboard={dashboard} />
//         <WorkstreamHealth dashboard={dashboard} />
//         <ExecutiveActions dashboard={dashboard} />
//         <BaselineSnapshot dashboard={dashboard} />
//         <CommittedScope dashboard={dashboard} />
//         <ReleaseRisks dashboard={dashboard} />
//         <SourceLinksFooter links={dashboard.sourceLinks} />
//       </div>
//     </div>
//   );
// }

import React from 'react';
import useDashboardData from './hooks/useDashboardData';

function formatTimestamp(value) {
  if (!value) {
    return 'Not refreshed yet';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function Section({ title, subtitle, children, compact = false }) {
  return (
    <section
      style={{
        marginBottom: 20,
        border: '1px solid rgba(148, 163, 184, 0.16)',
        borderRadius: 14,
        background: 'rgba(15, 23, 42, 0.74)',
        padding: compact ? 14 : 18,
        boxShadow: '0 18px 30px rgba(2, 6, 23, 0.18)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{title}</div>
          {subtitle ? <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 13 }}>{subtitle}</div> : null}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function MetricCard({ label, value, tone = 'slate' }) {
  const colors = {
    slate: ['rgba(148, 163, 184, 0.16)', '#f8fafc'],
    amber: ['rgba(245, 158, 11, 0.18)', '#fde68a'],
    teal: ['rgba(20, 184, 166, 0.18)', '#99f6e4'],
    rose: ['rgba(244, 63, 94, 0.16)', '#fecdd3']
  };
  const [background, color] = colors[tone] || colors.slate;

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        background,
        border: '1px solid rgba(148, 163, 184, 0.14)',
        minHeight: 96
      }}
    >
      <div style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 8, color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SourceBlock({ source }) {
  if (!source) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>Not available</div>;
  }

  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
      <div><strong style={{ color: '#f8fafc' }}>{source.system}</strong></div>
      <div>Endpoint: {source.endpoint || 'Not available'}</div>
      {'jql' in source ? <div>JQL: {source.jql || 'Not available'}</div> : null}
      {'cql' in source ? <div>CQL: {source.cql || 'Not available'}</div> : null}
      {'spaceKey' in source ? <div>Space: {source.spaceKey || 'Not available'}</div> : null}
      <div>Transformation: {source.transformationSummary || 'Not available'}</div>
      <div>Last refresh: {formatTimestamp(source.lastRefresh)}</div>
    </div>
  );
}

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
    teamOptions,
    confluenceSpaceOptions,
    viewOptions
  } = useDashboardData();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 520 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '4px solid rgba(148, 163, 184, 0.25)',
              borderTopColor: '#2dd4bf',
              animation: 'spin 0.9s linear infinite',
              margin: '0 auto 16px'
            }}
          />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Loading dashboard</div>
          <div style={{ color: '#94a3b8' }}>Fetching live Jira, Confluence, and AI summary data now.</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const records = Array.isArray(dashboard.records) ? dashboard.records : [];
  const workstreams = Array.isArray(dashboard.workstreams) ? dashboard.workstreams : [];
  const topRecords = records.slice(0, 8);
  const aiSummary = dashboard.aiSummary || 'OpenAI did not return a summary for this run. The live Jira and Confluence data are still displayed below.';

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 24,
        background: 'radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 28%), linear-gradient(180deg, #020617 0%, #0f172a 100%)',
        color: '#e2e8f0',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div style={{ maxWidth: 1480, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <div style={{ color: '#94a3b8', fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Executive PMO Intelligence Dashboard
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 34, lineHeight: 1.05, color: '#f8fafc' }}>AI Dashboard</h1>
          <div style={{ marginTop: 10, color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 }}>
            Release {dashboard.scope?.releaseId || config.releaseId} for team {dashboard.scope?.team || config.team}
            {' '}using Confluence space {dashboard.scope?.confluenceSpaceKey || config.confluenceSpaceKey}
            {' '}| {dashboard.summary?.total ?? 0} issues | refreshed {formatTimestamp(dashboard.summary?.refreshedAt)}
          </div>
        </header>

        {error ? (
          <div
            style={{
              marginBottom: 20,
              borderRadius: 12,
              border: '1px solid rgba(248, 113, 113, 0.3)',
              background: 'rgba(127, 29, 29, 0.35)',
              color: '#fecaca',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Live data unavailable</div>
              <div style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{error}</div>
            </div>
            <button
              type="button"
              onClick={() => refresh({}, { showLoading: true })}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(248, 113, 113, 0.45)',
                background: 'transparent',
                color: '#fecaca',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <Section
          title="Filters"
          subtitle="The dashboard is grounded in one release and one team, with the scope visible and editable here."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14
            }}
          >
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8' }}>
                Release
              </span>
              <select
                value={config.releaseId}
                onChange={(event) => {
                  const releaseId = event.target.value;
                  updateConfig({ releaseId });
                  refresh({ releaseId });
                }}
                style={selectStyle}
              >
                {releaseOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8' }}>
                Team
              </span>
              <select
                value={config.team}
                onChange={(event) => {
                  const team = event.target.value;
                  updateConfig({ team });
                  refresh({ team });
                }}
                style={selectStyle}
              >
                {teamOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8' }}>
                Confluence Space
              </span>
              <select
                value={config.confluenceSpaceKey}
                onChange={(event) => {
                  const confluenceSpaceKey = event.target.value;
                  updateConfig({ confluenceSpaceKey });
                  refresh({ confluenceSpaceKey });
                }}
                style={selectStyle}
              >
                {confluenceSpaceOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8' }}>
                View
              </span>
              <select
                value={config.view}
                onChange={(event) => {
                  const view = event.target.value;
                  updateConfig({ view });
                  refresh({ view });
                }}
                style={selectStyle}
              >
                {viewOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => refresh({}, { showLoading: true })}
              style={primaryButtonStyle}
            >
              Refresh live data
            </button>
            <button
              type="button"
              onClick={() => {
                resetConfig();
                refresh({
                  releaseId: 'VMSv26.06.00',
                  team: 'VMS',
                  confluenceSpaceKey: 'PS',
                  view: 'Executive'
                });
              }}
              style={secondaryButtonStyle}
            >
              Reset scope
            </button>
          </div>
        </Section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 20
          }}
        >
          <MetricCard label="High risk" value={dashboard.metrics.highRisk || 0} tone="rose" />
          <MetricCard label="Medium risk" value={dashboard.metrics.mediumRisk || 0} tone="amber" />
          <MetricCard label="Blockers" value={dashboard.metrics.blockers || 0} tone="teal" />
          <MetricCard label="Decisions needed" value={dashboard.metrics.decisionsNeeded || 0} tone="slate" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 20, alignItems: 'start' }}>
          <Section title="Executive Summary" subtitle="Grounded in the live Jira and Confluence payloads." compact>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#e2e8f0' }}>{aiSummary}</div>
          </Section>

          <Section title="Source Status" subtitle="Each source keeps its own refresh trail." compact>
            <div style={{ display: 'grid', gap: 14 }}>
              <SourceBlock source={dashboard.sourceLinks?.jira} />
              <SourceBlock source={dashboard.sourceLinks?.confluence} />
              <SourceBlock source={dashboard.sourceLinks?.openai} />
            </div>
          </Section>
        </div>

        <Section
          title="Workstreams"
          subtitle={`Jira work grouped by components or assignee. ${workstreams.length} grouped rows.`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {workstreams.length > 0 ? workstreams.map((item) => (
              <div
                key={item.name}
                style={{
                  borderRadius: 12,
                  padding: 14,
                  background: 'rgba(2, 6, 23, 0.38)',
                  border: '1px solid rgba(148, 163, 184, 0.12)'
                }}
              >
                <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>{item.name}</div>
                <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 }}>
                  <div>Total: {item.total}</div>
                  <div>Blocked: {item.blocked}</div>
                  <div>High risk: {item.highRisk}</div>
                </div>
              </div>
            )) : (
              <div style={{ color: '#94a3b8' }}>No workstream data available yet.</div>
            )}
          </div>
        </Section>

        <Section title="Live Issues" subtitle="The top records are pulled directly from Jira and normalized for executive scanning.">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={tableHeaderStyle}>Key</th>
                  <th style={tableHeaderStyle}>Type</th>
                  <th style={tableHeaderStyle}>Summary</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Owner</th>
                  <th style={tableHeaderStyle}>Risk</th>
                  <th style={tableHeaderStyle}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {topRecords.length > 0 ? topRecords.map((record) => (
                  <tr key={record.issueKey} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.12)' }}>
                    <td style={tableCellStyle}>{record.issueKey}</td>
                    <td style={tableCellStyle}>{record.issueType}</td>
                    <td style={tableCellStyle}>{record.summary}</td>
                    <td style={tableCellStyle}>{record.status}</td>
                    <td style={tableCellStyle}>{record.owner}</td>
                    <td style={tableCellStyle}>{record.risk?.label || 'unknown'}</td>
                    <td style={tableCellStyle}>{record.confidence?.label || 'unknown'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td style={{ ...tableCellStyle, color: '#94a3b8' }} colSpan={7}>
                      No Jira issues were returned for the current release scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Confluence Baseline" subtitle="The selected space is searched for live pages and summarized below.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <MetricCard label="Confluence pages" value={dashboard.baselineSnapshot?.pages || 0} tone="teal" />
            <MetricCard label="Committed issues" value={dashboard.committedScope?.issues || 0} tone="amber" />
            <MetricCard label="Release key" value={dashboard.releaseSnapshot?.releaseId || config.releaseId} tone="slate" />
          </div>
        </Section>
      </div>
    </div>
  );
}

const selectStyle = {
  width: '100%',
  minHeight: 40,
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.28)',
  background: '#0f172a',
  color: '#e2e8f0',
  padding: '0 12px',
  outline: 'none'
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

const secondaryButtonStyle = {
  minHeight: 40,
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.25)',
  background: 'transparent',
  color: '#e2e8f0',
  padding: '0 16px',
  cursor: 'pointer',
  fontWeight: 700
};

const tableHeaderStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.12)'
};

const tableCellStyle = {
  padding: '12px',
  verticalAlign: 'top',
  color: '#e2e8f0',
  lineHeight: 1.45
};