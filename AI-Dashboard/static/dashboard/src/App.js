import React from 'react';
import useDashboardData from './hooks/useDashboardData';

const COLORS = {
  ink: '#172b4d',
  muted: '#626f86',
  border: '#dfe1e6',
  canvas: '#f4f5f7',
  blue: '#0c66e4',
  blueSoft: '#e9f2ff',
  green: '#216e4e',
  greenSoft: '#dcfff1',
  amber: '#a54800',
  amberSoft: '#fff7d6',
  red: '#ae2a19',
  redSoft: '#ffeceb'
};

function formatTimestamp(value) {
  if (!value) return 'Not available';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatConfluenceType(item) {
  if (item?.type === 'page' && item?.subtype === 'live') return 'Live doc';
  return ({ page: 'Page', folder: 'Folder', database: 'Database', embed: 'Smart link', whiteboard: 'Whiteboard' })[item?.type] || 'Content';
}

function isDone(status) {
  return /done|closed|resolved|complete/i.test(String(status || ''));
}

function isActive(status) {
  return /progress|review|testing|qa|development/i.test(String(status || ''));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toneForRisk(risk) {
  if (risk === 'high') return 'red';
  if (risk === 'medium') return 'amber';
  return 'neutral';
}

function jiraUrl(issueKey) {
  return issueKey ? `https://365retailmarkets.atlassian.net/browse/${encodeURIComponent(issueKey)}` : '';
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
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={pageStyle}>
        <div style={panelStyle}>
          <h1 style={{ marginTop: 0, color: COLORS.red }}>Dashboard failed to render</h1>
          <p>The browser console contains the underlying error.</p>
          <pre style={preStyle}>{String(this.state.error?.message || this.state.error || 'Unknown error')}</pre>
        </div>
      </div>
    );
  }
}

function Section({ id, title, description, action, children }) {
  return (
    <section id={id} style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          {description ? <div style={sectionDescriptionStyle}>{description}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail, tone = 'neutral' }) {
  const palette = {
    neutral: { background: '#f7f8f9', color: COLORS.ink },
    blue: { background: COLORS.blueSoft, color: COLORS.blue },
    green: { background: COLORS.greenSoft, color: COLORS.green },
    amber: { background: COLORS.amberSoft, color: COLORS.amber },
    red: { background: COLORS.redSoft, color: COLORS.red }
  }[tone];

  return (
    <div style={{ ...metricCardStyle, background: palette.background }}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={{ ...metricValueStyle, color: palette.color }}>{value}</div>
      {detail ? <div style={metricDetailStyle}>{detail}</div> : null}
    </div>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  const palette = {
    neutral: { background: '#f1f2f4', color: '#44546f' },
    blue: { background: COLORS.blueSoft, color: COLORS.blue },
    green: { background: COLORS.greenSoft, color: COLORS.green },
    amber: { background: COLORS.amberSoft, color: COLORS.amber },
    red: { background: COLORS.redSoft, color: COLORS.red }
  }[tone];
  return <span style={{ ...pillStyle, ...palette }}>{children}</span>;
}

function ProgressBar({ value, tone = 'blue' }) {
  const color = { neutral: '#8993a4', blue: COLORS.blue, green: COLORS.green, amber: '#f5a623', red: '#e2483d' }[tone];
  return (
    <div style={progressTrackStyle} aria-label={`${value}%`}>
      <div style={{ ...progressFillStyle, width: `${clamp(value, 0, 100)}%`, background: color }} />
    </div>
  );
}

function AiRiskCard({ risk }) {
  return (
    <div style={riskCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={rowTitleStyle}>{risk.title}</div>
          <div style={rowMetaStyle}>{risk.category} · {risk.owner || 'Owner not identified'} · {risk.status || 'Status not stated'}</div>
        </div>
        <StatusPill tone={toneForRisk(risk.severity)}>{risk.severity} risk</StatusPill>
      </div>
      <div style={riskDescriptionStyle}>{risk.description}</div>
      <div style={riskImpactStyle}><strong>Potential impact:</strong> {risk.impact}</div>
      <div style={riskImpactStyle}><strong>Recommended action:</strong> {risk.recommendedAction}</div>
      <div style={evidenceListStyle}>
        {(risk.evidence || []).map((evidence, index) => (
          evidence.url ? (
            <a key={`${evidence.sourceSystem}-${evidence.sourceId}-${index}`} href={evidence.url} target="_blank" rel="noreferrer" style={evidenceLinkStyle}>
              {evidence.sourceSystem}: {evidence.title || evidence.sourceId}
            </a>
          ) : (
            <span key={`${evidence.sourceSystem}-${evidence.sourceId}-${index}`} style={evidenceLinkStyle}>
              {evidence.sourceSystem}: {evidence.title || evidence.sourceId}
            </span>
          )
        ))}
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return <div style={emptyStateStyle}>{children}</div>;
}

function ScopeControls({ config, releaseOptions, confluenceSpaceOptions, onApply }) {
  const [releaseId, setReleaseId] = React.useState(config?.releaseId || '');
  const [spaceKey, setSpaceKey] = React.useState(config?.confluenceSpaceKey || '');

  React.useEffect(() => {
    setReleaseId(config?.releaseId || '');
    setSpaceKey(config?.confluenceSpaceKey || '');
  }, [config?.releaseId, config?.confluenceSpaceKey]);

  const submit = (event) => {
    event.preventDefault();
    const nextRelease = releaseId.trim();
    const nextSpace = spaceKey.trim();
    if (!nextRelease || !nextSpace) return;
    onApply({ releaseId: nextRelease, confluenceSpaceKey: nextSpace });
  };

  return (
    <form onSubmit={submit} style={scopePanelStyle}>
      <div style={{ minWidth: 220 }}>
        <div style={scopeTitleStyle}>Readout scope</div>
        <div style={scopeHelpStyle}>Choose the Jira release and Confluence knowledge source for the AI analysis.</div>
      </div>
      <div style={scopeFieldsStyle}>
        <label style={fieldLabelStyle}>
          <span>Jira fix version</span>
          <input
            type="text"
            list="release-options"
            value={releaseId}
            onChange={(event) => setReleaseId(event.target.value)}
            placeholder="Enter the exact fix version"
            style={inputStyle}
            required
          />
          <datalist id="release-options">
            {(releaseOptions || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </datalist>
        </label>
        <label style={fieldLabelStyle}>
          <span>Confluence space</span>
          <input
            type="text"
            list="confluence-space-options"
            value={spaceKey}
            onChange={(event) => setSpaceKey(event.target.value.toUpperCase())}
            placeholder="Enter a space key, for example PS"
            style={inputStyle}
            required
          />
          <datalist id="confluence-space-options">
            {(confluenceSpaceOptions || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </datalist>
        </label>
        <button type="submit" style={{ ...primaryButtonStyle, alignSelf: 'end' }}>Generate readout</button>
      </div>
    </form>
  );
}

export default function App() {
  const { loading, error, config, dashboard, refresh, releaseOptions, confluenceSpaceOptions } = useDashboardData();
  const summary = dashboard?.summary || {};
  const metrics = dashboard?.metrics || {};
  const sourceLinks = dashboard?.sourceLinks || {};
  const cardStates = dashboard?.cardStates || {};
  const records = Array.isArray(dashboard?.records) ? dashboard.records : [];
  const actions = Array.isArray(dashboard?.actions) ? dashboard.actions : [];
  const confluenceItems = Array.isArray(dashboard?.confluenceItems) ? dashboard.confluenceItems : [];
  const aiAnalysis = dashboard?.aiAnalysis || null;
  const aiStatus = dashboard?.aiStatus || {};
  const aiRisks = Array.isArray(aiAnalysis?.risks) ? aiAnalysis.risks : [];
  const analysisAvailable = Boolean(aiAnalysis && metrics.analysisAvailable);

  const total = records.length;
  const completed = records.filter((record) => isDone(record.status)).length;
  const active = records.filter((record) => isActive(record.status)).length;
  const blocked = records.filter((record) => /blocked|blocker/i.test(String(record.status || ''))).length;
  const highRisk = records.filter((record) => record?.risk?.label === 'high').length;
  const notStarted = Math.max(total - completed - active, 0);
  const completionPercent = total ? Math.round((completed / total) * 100) : 0;
  const confidenceScore = analysisAvailable ? clamp(Number(aiAnalysis?.confidence?.score || 0), 0, 100) : 0;
  const confidenceLabel = analysisAvailable
    ? ({ on_track: 'On track', watch: 'Watch', at_risk: 'At risk', insufficient_data: 'Insufficient data' }[aiAnalysis?.confidence?.label] || 'Unknown')
    : 'Awaiting AI';
  const confidenceTone = !analysisAvailable ? 'neutral' : confidenceScore >= 80 ? 'green' : confidenceScore >= 60 ? 'amber' : 'red';
  const meetingItems = confluenceItems.filter((item) =>
    item?.subtype === 'live' || /meeting|standup|sync|weekly|retro|minutes|agenda|planning|status update/i.test(item?.title || '')
  );

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...panelStyle, maxWidth: 720, margin: '80px auto' }}>
          <div style={eyebrowStyle}>Executive PMO Intelligence</div>
          <h1 style={{ margin: '8px 0', color: COLORS.ink }}>Loading release intelligence</h1>
          <p style={{ color: COLORS.muted }}>Connecting Jira, Confluence, and the executive analysis layer…</p>
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <div style={pageStyle}>
        <div style={shellStyle}>
          <header style={headerStyle}>
            <div>
              <div style={eyebrowStyle}>Executive PMO Intelligence</div>
              <h1 style={pageTitleStyle}>VMS Release Dashboard</h1>
              <div style={headerMetaStyle}>
                <strong>{dashboard?.scope?.releaseId || config?.releaseId || 'Unknown release'}</strong>
                <span>·</span>
                <span>{dashboard?.scope?.team || config?.team || 'Unknown team'}</span>
                <span>·</span>
                <span>Confluence {dashboard?.scope?.confluenceSpaceKey || config?.confluenceSpaceKey || 'Unknown space'}</span>
                <span>·</span>
                <span>Updated {formatTimestamp(summary.refreshedAt)}</span>
              </div>
            </div>
            <button type="button" onClick={() => refresh({}, { showLoading: true })} style={primaryButtonStyle}>Refresh data</button>
          </header>

          <nav style={navStyle} aria-label="Dashboard sections">
            {[
              ['overview', 'Overview'],
              ['release-confidence', 'Release Confidence'],
              ['project-health', 'Project Health'],
              ['risks-blockers', 'Risks & Blockers'],
              ['meeting-intelligence', 'Meeting Intelligence'],
              ['data-quality', 'Data Quality']
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={navLinkStyle}
              >
                {label}
              </button>
            ))}
          </nav>

          <ScopeControls
            config={config}
            releaseOptions={releaseOptions}
            confluenceSpaceOptions={confluenceSpaceOptions}
            onApply={(scope) => refresh(scope, { showLoading: true })}
          />

          {error ? (
            <div style={errorStyle}><strong>Live data unavailable</strong><div style={{ marginTop: 5 }}>{error}</div></div>
          ) : null}

          <Section id="overview" title="Overview" description="The current executive view of release scope and progress.">
            <div style={metricGridStyle}>
              <MetricCard label="Release scope" value={total} detail="Stories and bugs" tone="blue" />
              <MetricCard label="Completed" value={completed} detail={`${completionPercent}% of scope`} tone="green" />
              <MetricCard label="In motion" value={active} detail="In progress or review" />
              <MetricCard label="Confluence sources" value={confluenceItems.length} detail={`Pages and live docs from ${dashboard?.scope?.confluenceSpaceKey || config?.confluenceSpaceKey}`} />
            </div>
            <div style={summaryCalloutStyle}>
              <div style={calloutLabelStyle}>Executive readout</div>
              <div style={summaryStyle}>{dashboard?.aiSummary || aiStatus.message || 'AI analysis is not available yet.'}</div>
            </div>
          </Section>

          <Section id="release-confidence" title="Release Confidence" description="AI assessment grounded in the current Jira delivery data and Confluence project documentation.">
            <div style={twoColumnStyle}>
              <div style={confidenceCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <div style={metricLabelStyle}>Current confidence</div>
                    <div style={{ ...confidenceScoreStyle, color: confidenceTone === 'neutral' ? COLORS.muted : COLORS[confidenceTone] }}>
                      {analysisAvailable ? `${confidenceScore}%` : '—'}
                    </div>
                  </div>
                  <StatusPill tone={confidenceTone}>{confidenceLabel}</StatusPill>
                </div>
                <ProgressBar value={confidenceScore} tone={confidenceTone} />
                <div style={metricDetailStyle}>{aiAnalysis?.confidence?.rationale || aiStatus.message || 'Waiting for AI analysis.'}</div>
              </div>
              <div style={compactMetricGridStyle}>
                <MetricCard label="Scope complete" value={`${completionPercent}%`} detail={`${completed} of ${total}`} tone="green" />
                <MetricCard label="High risk" value={analysisAvailable ? metrics.highRisk : '—'} detail="AI-identified risks" tone={analysisAvailable && metrics.highRisk > 0 ? 'red' : 'neutral'} />
                <MetricCard label="Blockers" value={analysisAvailable ? metrics.blockers : '—'} detail="AI-confirmed blockers" tone={analysisAvailable && metrics.blockers > 0 ? 'red' : 'neutral'} />
                <MetricCard label="Decisions" value={analysisAvailable ? metrics.decisionsNeeded : '—'} detail="Evidence indicates a decision is needed" tone={analysisAvailable && metrics.decisionsNeeded > 0 ? 'amber' : 'neutral'} />
              </div>
            </div>
          </Section>

          <Section id="project-health" title="Project Health" description="Delivery flow and health by workstream.">
            <div style={statusStripStyle}>
              <div><strong>{completed}</strong><span>Complete</span></div>
              <div><strong>{active}</strong><span>In motion</span></div>
              <div><strong>{notStarted}</strong><span>Other / not started</span></div>
            </div>
            <ProgressBar value={completionPercent} tone="blue" />
            <div style={{ marginTop: 22 }}>
              <div style={subsectionTitleStyle}>Workstream health</div>
              <div style={metricGridStyle}>
                <MetricCard label="Blocked" value={blocked} detail="Items currently stopped" tone={blocked > 0 ? 'red' : 'neutral'} />
                <MetricCard label="High risk" value={analysisAvailable ? highRisk : '—'} detail="AI-identified delivery risks" tone={highRisk > 0 ? 'red' : 'neutral'} />
                <MetricCard label="Complete" value={completed} detail={`${completionPercent}% of release scope`} tone="green" />
                <MetricCard label="In motion" value={active} detail="In progress, review, testing, or QA" tone="blue" />
              </div>
            </div>
          </Section>

          <Section id="risks-blockers" title="Risks and Blockers" description="The items most likely to affect release confidence or require an executive decision.">
            <div style={metricGridStyle}>
              <MetricCard label="High risk" value={analysisAvailable ? metrics.highRisk : '—'} tone={analysisAvailable && metrics.highRisk ? 'red' : 'neutral'} />
              <MetricCard label="Medium risk" value={analysisAvailable ? metrics.mediumRisk : '—'} tone={analysisAvailable && metrics.mediumRisk ? 'amber' : 'neutral'} />
              <MetricCard label="Blocked" value={analysisAvailable ? metrics.blockers : '—'} tone={analysisAvailable && metrics.blockers ? 'red' : 'neutral'} />
              <MetricCard label="Decisions needed" value={analysisAvailable ? metrics.decisionsNeeded : '—'} tone={analysisAvailable && metrics.decisionsNeeded ? 'amber' : 'neutral'} />
            </div>
            <div style={{ ...twoColumnStyle, marginTop: 20 }}>
              <div>
                <div style={subsectionTitleStyle}>Evidence-backed risks</div>
                {aiRisks.length ? aiRisks.map((risk) => <AiRiskCard key={risk.id} risk={risk} />) : <EmptyState>{analysisAvailable ? 'The AI analysis did not identify evidence-supported risks.' : aiStatus.message || 'AI risk analysis is unavailable.'}</EmptyState>}
              </div>
              <div>
                <div style={subsectionTitleStyle}>Executive decisions</div>
                {actions.length ? actions.map((action, index) => (
                  <div key={`${action.issueKey || action.summary}-${index}`} style={listRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      {(action.sourceUrl || action.issueKey) ? <a href={action.sourceUrl || jiraUrl(action.issueKey)} target="_blank" rel="noreferrer" style={sourceLinkStyle}>{action.issueKey || 'Open evidence'}</a> : null}
                      <div style={{ ...rowTitleStyle, marginTop: 4 }}>{action.summary}</div>
                      <div style={rowMetaStyle}>{action.owner} · {action.status}</div>
                    </div>
                  </div>
                )) : <EmptyState>No decision or approval items were detected.</EmptyState>}
              </div>
            </div>
          </Section>

          <Section id="meeting-intelligence" title="Meeting Intelligence" description="Meeting artifacts and follow-ups discovered beneath the Parlevel Confluence page.">
            <div style={twoColumnStyle}>
              <div>
                <div style={subsectionTitleStyle}>Relevant meeting sources</div>
                {meetingItems.length ? meetingItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} style={listRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={rowTitleStyle}>{item.title || 'Untitled'}</div>
                      <div style={rowMetaStyle}>{formatConfluenceType(item)}{item.updatedAt ? ` · Updated ${formatTimestamp(item.updatedAt)}` : ''}</div>
                    </div>
                    {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>Open</a> : null}
                  </div>
                )) : <EmptyState>No meeting notes, live docs, or agendas were detected in the current Confluence tree.</EmptyState>}
              </div>
              <div>
                <div style={subsectionTitleStyle}>Captured follow-ups</div>
                {actions.length ? actions.slice(0, 6).map((action, index) => (
                  <div key={`meeting-${action.issueKey || action.summary}-${index}`} style={listRowStyle}>
                    <div>
                      <div style={rowTitleStyle}>{action.summary}</div>
                      <div style={rowMetaStyle}>{action.owner} · {action.status}</div>
                    </div>
                    {(action.sourceUrl || action.issueKey) ? <a href={action.sourceUrl || jiraUrl(action.issueKey)} target="_blank" rel="noreferrer" style={sourceLinkStyle}>{action.issueKey || 'Open evidence'}</a> : null}
                  </div>
                )) : <EmptyState>No decision-oriented Jira follow-ups were detected.</EmptyState>}
              </div>
            </div>
          </Section>

          <Section id="data-quality" title="Data Quality" description="Freshness, source availability, and traceability behind this dashboard.">
            <div style={threeColumnStyle}>
              <SourceCard name="Jira" state={cardStates.jira} detail={`${total} release items`} refreshedAt={sourceLinks.jira?.lastRefresh} />
              <SourceCard name="Confluence" state={cardStates.confluence} detail={sourceLinks.confluence?.error || `${confluenceItems.length} source items from ${sourceLinks.confluence?.spaceKey || config?.confluenceSpaceKey}`} refreshedAt={sourceLinks.confluence?.lastRefresh} link={sourceLinks.confluence?.pageUrl} />
              <SourceCard name="AI analysis" state={cardStates.openai} detail={`${sourceLinks.openai?.model || 'Model unavailable'} · ${aiStatus.message || 'Status unavailable'}`} refreshedAt={sourceLinks.openai?.lastRefresh} />
            </div>
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>View source lineage ({confluenceItems.length} Confluence items)</summary>
              <div style={{ marginTop: 12 }}>
                {confluenceItems.length ? confluenceItems.map((item) => (
                  <div key={`source-${item.type}-${item.id}`} style={{ ...sourceRowStyle, paddingLeft: 14 + Math.min(Number(item.depth || 0), 6) * 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={rowTitleStyle}>{item.title || 'Untitled'}</div>
                      <div style={rowMetaStyle}>{formatConfluenceType(item)} · ID {item.id}</div>
                    </div>
                    {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>Open source</a> : <span style={rowMetaStyle}>Link unavailable</span>}
                  </div>
                )) : <EmptyState>No Confluence source lineage is available.</EmptyState>}
              </div>
            </details>
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>View Jira query</summary>
              <pre style={{ ...preStyle, marginTop: 12 }}>{sourceLinks.jira?.jql || 'JQL unavailable'}</pre>
            </details>
            <details style={detailsStyle}>
              <summary style={detailsSummaryStyle}>View AI data gaps ({aiAnalysis?.dataGaps?.length || 0})</summary>
              <div style={{ marginTop: 12 }}>
                {aiAnalysis?.dataGaps?.length ? aiAnalysis.dataGaps.map((gap, index) => (
                  <div key={`${gap}-${index}`} style={listRowStyle}>{gap}</div>
                )) : <EmptyState>No AI data gaps were reported.</EmptyState>}
              </div>
            </details>
          </Section>
        </div>
      </div>
    </AppErrorBoundary>
  );
}

function SourceCard({ name, state, detail, refreshedAt, link }) {
  const loaded = state === 'loaded';
  const tone = loaded ? 'green' : state === 'loading' ? 'amber' : 'red';
  return (
    <div style={sourceCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <strong>{name}</strong>
        <StatusPill tone={tone}>{loaded ? 'Connected' : state === 'loading' ? 'Loading' : 'No data'}</StatusPill>
      </div>
      <div style={{ ...rowMetaStyle, marginTop: 14 }}>{detail}</div>
      <div style={rowMetaStyle}>Refreshed {formatTimestamp(refreshedAt)}</div>
      {link ? <a href={link} target="_blank" rel="noreferrer" style={{ ...sourceLinkStyle, display: 'inline-block', marginTop: 10 }}>Open source</a> : null}
    </div>
  );
}

const pageStyle = { minHeight: '100vh', padding: '24px 20px 56px', background: COLORS.canvas, color: COLORS.ink, fontFamily: 'Arial, sans-serif' };
const shellStyle = { maxWidth: 1440, margin: '0 auto' };
const panelStyle = { background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(9,30,66,0.08)' };
const headerStyle = { ...panelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 14 };
const pageTitleStyle = { margin: '6px 0 8px', fontSize: 34, lineHeight: 1.1, color: COLORS.ink };
const headerMetaStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', color: '#44546f', lineHeight: 1.5 };
const eyebrowStyle = { color: COLORS.blue, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' };
const navStyle = { ...panelStyle, display: 'flex', gap: 8, flexWrap: 'wrap', padding: 10, marginBottom: 18, position: 'sticky', top: 8, zIndex: 2 };
const navLinkStyle = { color: '#44546f', background: '#fff', border: `1px solid transparent`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '8px 11px', borderRadius: 8, cursor: 'pointer' };
const sectionStyle = { ...panelStyle, marginBottom: 18, scrollMarginTop: 86 };
const sectionHeaderStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 18 };
const sectionTitleStyle = { margin: 0, fontSize: 21, color: COLORS.ink };
const sectionDescriptionStyle = { color: COLORS.muted, lineHeight: 1.5, marginTop: 5 };
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 };
const compactMetricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(145px, 1fr))', gap: 12 };
const metricCardStyle = { borderRadius: 11, padding: 16, border: `1px solid ${COLORS.border}`, minHeight: 104 };
const metricLabelStyle = { color: COLORS.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };
const metricValueStyle = { fontSize: 30, fontWeight: 800, marginTop: 9, lineHeight: 1 };
const metricDetailStyle = { color: COLORS.muted, fontSize: 12, marginTop: 9, lineHeight: 1.4 };
const summaryCalloutStyle = { marginTop: 16, background: '#f7f8f9', borderLeft: `4px solid ${COLORS.blue}`, padding: '18px 20px', borderRadius: '0 10px 10px 0' };
const calloutLabelStyle = { ...metricLabelStyle, color: COLORS.blue, marginBottom: 9 };
const summaryStyle = { whiteSpace: 'pre-wrap', lineHeight: 1.65, color: COLORS.ink };
const twoColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18 };
const threeColumnStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const confidenceCardStyle = { padding: 20, background: '#f7f8f9', border: `1px solid ${COLORS.border}`, borderRadius: 12 };
const confidenceScoreStyle = { fontSize: 46, fontWeight: 800, lineHeight: 1, margin: '10px 0 18px' };
const progressTrackStyle = { height: 9, background: '#dfe1e6', borderRadius: 999, overflow: 'hidden' };
const progressFillStyle = { height: '100%', borderRadius: 999, transition: 'width 250ms ease' };
const pillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 9px', fontSize: 11, lineHeight: 1, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' };
const statusStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 };
const subsectionTitleStyle = { fontSize: 13, fontWeight: 800, color: COLORS.ink, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 };
const listRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '13px 0', borderBottom: `1px solid ${COLORS.border}` };
const rowTitleStyle = { display: 'flex', gap: 8, alignItems: 'baseline', color: COLORS.ink, fontWeight: 700, lineHeight: 1.4 };
const rowMetaStyle = { color: COLORS.muted, fontSize: 12, marginTop: 4, lineHeight: 1.4 };
const sourceLinkStyle = { color: COLORS.blue, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' };
const sourceCardStyle = { padding: 16, border: `1px solid ${COLORS.border}`, borderRadius: 11, background: '#f7f8f9' };
const scopePanelStyle = { ...panelStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 18 };
const scopeTitleStyle = { color: COLORS.ink, fontSize: 16, fontWeight: 800 };
const scopeHelpStyle = { color: COLORS.muted, fontSize: 12, lineHeight: 1.45, marginTop: 5 };
const scopeFieldsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'end', gap: 12, flex: '1 1 680px' };
const fieldLabelStyle = { display: 'grid', gap: 6, color: '#44546f', fontSize: 12, fontWeight: 700 };
const inputStyle = { width: '100%', minHeight: 40, boxSizing: 'border-box', border: `1px solid ${COLORS.border}`, borderRadius: 8, background: '#fff', color: COLORS.ink, padding: '0 11px', fontSize: 14 };
const riskCardStyle = { padding: 16, border: `1px solid ${COLORS.border}`, borderRadius: 11, background: '#fafbfc', marginBottom: 10 };
const riskDescriptionStyle = { marginTop: 12, color: COLORS.ink, lineHeight: 1.55 };
const riskImpactStyle = { marginTop: 9, color: '#44546f', fontSize: 13, lineHeight: 1.5 };
const evidenceListStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 13 };
const evidenceLinkStyle = { color: COLORS.blue, background: COLORS.blueSoft, padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' };
const detailsStyle = { marginTop: 14, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '12px 14px', background: '#fafbfc' };
const detailsSummaryStyle = { cursor: 'pointer', fontWeight: 700, color: COLORS.ink };
const sourceRowStyle = { ...listRowStyle, paddingRight: 14 };
const emptyStateStyle = { padding: 16, border: '1px dashed #b3b9c4', borderRadius: 9, color: COLORS.muted, background: '#fafbfc', lineHeight: 1.5 };
const preStyle = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 14, borderRadius: 9, background: '#f1f2f4', color: COLORS.ink, border: 0 };
const errorStyle = { marginBottom: 18, borderRadius: 10, border: '1px solid #f15b50', background: COLORS.redSoft, color: COLORS.red, padding: '14px 16px' };
const primaryButtonStyle = { minHeight: 40, borderRadius: 9, border: `1px solid ${COLORS.blue}`, background: COLORS.blue, color: '#fff', padding: '0 16px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' };
