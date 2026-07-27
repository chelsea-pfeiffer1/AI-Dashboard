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

function formatDate(value) {
  if (!value) return 'Date unavailable';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${value}T12:00:00Z`));
  } catch {
    return String(value);
  }
}

function releaseTimingDetail(releaseSnapshot) {
  if (!releaseSnapshot?.scheduleDataAvailable) return 'No target date set in Jira';
  if (releaseSnapshot.released) return 'Marked released in Jira';
  const days = Number(releaseSnapshot.daysUntilRelease);
  if (!Number.isFinite(days)) return 'Timing unavailable';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} past target`;
  if (days === 0) return 'Target date is today';
  return `${days} day${days === 1 ? '' : 's'} remaining`;
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

function formatDelta(value, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  return `${number > 0 ? '+' : ''}${number}${suffix}`;
}

function readinessLabel(value) {
  return ({ ready: 'Ready', conditional: 'Conditional', not_ready: 'Not ready' })[value] || 'Not assessed';
}

function readinessTone(value) {
  return value === 'ready' ? 'green' : value === 'not_ready' ? 'red' : 'amber';
}

function gateTone(value) {
  return value === 'pass' ? 'green' : value === 'fail' ? 'red' : 'amber';
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

function ConfidenceTrend({ history }) {
  const points = (Array.isArray(history) ? history : [])
    .filter((snapshot) => snapshot.confidenceScore != null)
    .slice(-12);
  if (points.length < 2) {
    return <EmptyState>A second snapshot is needed before a confidence trend can be drawn.</EmptyState>;
  }

  const coordinates = points.map((snapshot, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(100, Number(snapshot.confidenceScore)));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={trendChartStyle} role="img" aria-label="Release confidence history">
        <line x1="0" y1="20" x2="100" y2="20" stroke={COLORS.border} strokeWidth="1" />
        <line x1="0" y1="50" x2="100" y2="50" stroke={COLORS.border} strokeWidth="1" />
        <line x1="0" y1="80" x2="100" y2="80" stroke={COLORS.border} strokeWidth="1" />
        <polyline points={coordinates} fill="none" stroke={COLORS.blue} strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={rowMetaStyle}>{points.length} saved snapshots · latest {points[points.length - 1].confidenceScore}%</div>
    </div>
  );
}

function ScopeControls({ config, releaseOptions, confluenceSpaceOptions, onApply }) {
  const [releaseId, setReleaseId] = React.useState(config?.releaseId || '');
  const [spaceKey, setSpaceKey] = React.useState(config?.confluenceSpaceKey || '');
  const [slackConversationIds, setSlackConversationIds] = React.useState(config?.slackConversationIds || '');

  React.useEffect(() => {
    setReleaseId(config?.releaseId || '');
    setSpaceKey(config?.confluenceSpaceKey || '');
    setSlackConversationIds(config?.slackConversationIds || '');
  }, [config?.releaseId, config?.confluenceSpaceKey, config?.slackConversationIds]);

  const submit = (event) => {
    event.preventDefault();
    const nextRelease = releaseId.trim();
    const nextSpace = spaceKey.trim();
    if (!nextRelease || !nextSpace) return;
    onApply({
      releaseId: nextRelease,
      confluenceSpaceKey: nextSpace,
      slackConversationIds: slackConversationIds.trim()
    });
  };

  return (
    <form onSubmit={submit} style={scopePanelStyle}>
      <div style={{ minWidth: 220 }}>
        <div style={scopeTitleStyle}>Readout scope</div>
        <div style={scopeHelpStyle}>Choose the Jira release, Confluence source, and optional Slack conversations for the AI analysis.</div>
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
        <label style={fieldLabelStyle}>
          <span>Slack conversations (optional)</span>
          <input
            type="text"
            value={slackConversationIds}
            onChange={(event) => setSlackConversationIds(event.target.value.toUpperCase())}
            placeholder="C0123456789, G0123456789"
            style={inputStyle}
          />
          <span style={{ ...scopeHelpStyle, marginTop: 0 }}>Up to five channel, private-channel, or DM conversation IDs.</span>
        </label>
        <button type="submit" style={{ ...primaryButtonStyle, alignSelf: 'end' }}>Generate readout</button>
      </div>
    </form>
  );
}

function SnapshotLibrary({
  snapshots,
  activeSnapshot,
  loading,
  saving,
  error,
  canSave,
  suggestedTitle,
  onOpen,
  onSave,
  onDelete,
  onClose
}) {
  const [selectedId, setSelectedId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [note, setNote] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');

  React.useEffect(() => {
    if (!selectedId && snapshots?.length) {
      setSelectedId(snapshots[0].id);
    }
  }, [selectedId, snapshots]);

  React.useEffect(() => {
    if (canSave) {
      setTitle(suggestedTitle);
    }
  }, [canSave, suggestedTitle]);

  const selected = (snapshots || []).find((snapshot) => snapshot.id === selectedId);

  const submitSave = async (event) => {
    event.preventDefault();
    setConfirmation('');
    const saved = await onSave({ title: title.trim(), note: note.trim() });
    if (saved) {
      setSelectedId(saved.id);
      setConfirmation(`Saved “${saved.title}” for the executive dashboard library.`);
      setNote('');
    }
  };

  const removeSelected = async () => {
    if (!selected?.canDelete) return;
    if (!window.confirm(`Delete the saved dashboard “${selected.title}”? This cannot be undone.`)) return;
    const deleted = await onDelete(selected.id);
    if (deleted) {
      setSelectedId('');
      setConfirmation('Saved dashboard deleted.');
    }
  };

  return (
    <section style={snapshotLibraryStyle} aria-label="Saved executive dashboards">
      <div style={{ minWidth: 230 }}>
        <div style={scopeTitleStyle}>Executive snapshot library</div>
        <div style={scopeHelpStyle}>
          Open a frozen status view by name—no Jira release, Confluence space, or Slack conversation IDs required.
        </div>
      </div>
      <div style={snapshotWorkspaceStyle}>
        <div style={snapshotOpenStyle}>
          <label style={fieldLabelStyle}>
            <span>Saved dashboard</span>
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setConfirmation('');
              }}
              style={inputStyle}
              disabled={loading || !snapshots?.length}
            >
              {!snapshots?.length ? <option value="">No saved dashboards yet</option> : null}
              {(snapshots || []).map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.title} · {formatTimestamp(snapshot.savedAt)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!selectedId || loading}
            onClick={() => onOpen(selectedId)}
          >
            {loading ? 'Loading…' : 'Open saved view'}
          </button>
          {selected?.canDelete ? (
            <button type="button" style={dangerButtonStyle} onClick={removeSelected}>Delete</button>
          ) : null}
        </div>
        {activeSnapshot ? (
          <div style={savedSnapshotBannerStyle}>
            <div>
              <strong>Viewing saved version: {activeSnapshot.title}</strong>
              <div style={rowMetaStyle}>
                Saved {formatTimestamp(activeSnapshot.savedAt)} · Source data from {formatTimestamp(activeSnapshot.sourceRefreshedAt)}
              </div>
              {activeSnapshot.note ? <div style={{ marginTop: 7 }}>{activeSnapshot.note}</div> : null}
            </div>
            <button type="button" style={secondaryButtonStyle} onClick={onClose}>Return to live setup</button>
          </div>
        ) : (
          <form onSubmit={submitSave} style={snapshotSaveStyle}>
            <label style={fieldLabelStyle}>
              <span>Snapshot title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="July steering committee status"
                maxLength={100}
                style={inputStyle}
                disabled={!canSave || saving}
                required
              />
            </label>
            <label style={fieldLabelStyle}>
              <span>Executive note (optional)</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Context executives should know"
                maxLength={500}
                style={inputStyle}
                disabled={!canSave || saving}
              />
            </label>
            <button type="submit" style={primaryButtonStyle} disabled={!canSave || saving || !title.trim()}>
              {saving ? 'Saving…' : 'Save this version'}
            </button>
          </form>
        )}
        {!canSave && !activeSnapshot ? (
          <div style={scopeHelpStyle}>Generate a live readout below before saving a new version.</div>
        ) : null}
        {confirmation ? <div style={successStyle}>{confirmation}</div> : null}
        {error ? <div style={errorStyle}>{error}</div> : null}
      </div>
    </section>
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
    confluenceSpaceOptions,
    savedSnapshots,
    snapshotLoading,
    snapshotSaving,
    snapshotError,
    activeSnapshot,
    saveSnapshot,
    openSnapshot,
    deleteSnapshot,
    closeSnapshot
  } = useDashboardData();
  const hasSelectedScope = Boolean(config?.releaseId && config?.confluenceSpaceKey);
  const summary = dashboard?.summary || {};
  const metrics = dashboard?.metrics || {};
  const releaseSnapshot = dashboard?.releaseSnapshot || {};
  const releaseTrend = dashboard?.releaseTrend || {};
  const readiness = dashboard?.readiness || {};
  const deliveryForecast = dashboard?.deliveryForecast || {};
  const sourceLinks = dashboard?.sourceLinks || {};
  const cardStates = dashboard?.cardStates || {};
  const records = Array.isArray(dashboard?.records) ? dashboard.records : [];
  const actions = Array.isArray(dashboard?.actions) ? dashboard.actions : [];
  const confluenceItems = Array.isArray(dashboard?.confluenceItems) ? dashboard.confluenceItems : [];
  const slackItems = Array.isArray(dashboard?.slackItems) ? dashboard.slackItems : [];
  const raidRegister = Array.isArray(dashboard?.raidRegister) ? dashboard.raidRegister : [];
  const dependencySignals = Array.isArray(dashboard?.dependencySignals) ? dashboard.dependencySignals : [];
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
  const canSaveSnapshot = Boolean(!activeSnapshot && summary.refreshedAt && dashboard?.scope?.releaseId);
  const suggestedSnapshotTitle = canSaveSnapshot
    ? `${dashboard.scope.releaseId} · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}`
    : '';

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
            {activeSnapshot ? (
              <StatusPill tone="blue">Saved version</StatusPill>
            ) : (
              <button
                type="button"
                onClick={() => refresh({}, { showLoading: true })}
                style={primaryButtonStyle}
                disabled={!hasSelectedScope}
                title={hasSelectedScope ? 'Refresh the selected release and space' : 'Choose a fix version and Confluence space first'}
              >
                Refresh data
              </button>
            )}
          </header>

          <nav style={navStyle} aria-label="Dashboard sections">
            {[
              ['overview', 'Overview'],
              ['release-confidence', 'Release Confidence'],
              ['project-health', 'Project Health'],
              ['program-controls', 'PMO Controls'],
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

          <SnapshotLibrary
            snapshots={savedSnapshots}
            activeSnapshot={activeSnapshot}
            loading={snapshotLoading}
            saving={snapshotSaving}
            error={snapshotError}
            canSave={canSaveSnapshot}
            suggestedTitle={suggestedSnapshotTitle}
            onOpen={openSnapshot}
            onSave={saveSnapshot}
            onDelete={deleteSnapshot}
            onClose={closeSnapshot}
          />

          {!activeSnapshot ? (
            <ScopeControls
              config={config}
              releaseOptions={releaseOptions}
              confluenceSpaceOptions={confluenceSpaceOptions}
              onApply={(scope) => refresh(scope, { showLoading: true })}
            />
          ) : null}

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

          <Section id="release-confidence" title="Release Confidence" description="AI assessment of Jira release work against the target date, informed by Confluence meeting transcripts.">
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
                <MetricCard label="Target release" value={formatDate(releaseSnapshot.targetDate)} detail={releaseTimingDetail(releaseSnapshot)} tone={releaseSnapshot.scheduleDataAvailable ? 'blue' : 'neutral'} />
                <MetricCard label="Scope complete" value={`${completionPercent}%`} detail={`${completed} of ${total}`} tone="green" />
                <MetricCard label="High risk" value={analysisAvailable ? metrics.highRisk : '—'} detail="AI-identified risks" tone={analysisAvailable && metrics.highRisk > 0 ? 'red' : 'neutral'} />
                <MetricCard label="Blockers" value={analysisAvailable ? metrics.blockers : '—'} detail="AI-confirmed blockers" tone={analysisAvailable && metrics.blockers > 0 ? 'red' : 'neutral'} />
                <MetricCard label="Decisions" value={analysisAvailable ? metrics.decisionsNeeded : '—'} detail="Evidence indicates a decision is needed" tone={analysisAvailable && metrics.decisionsNeeded > 0 ? 'amber' : 'neutral'} />
                <MetricCard label="Forecast" value={deliveryForecast.expectedDate ? formatDate(deliveryForecast.expectedDate) : 'Insufficient data'} detail={deliveryForecast.bestCaseDate ? `${formatDate(deliveryForecast.bestCaseDate)} to ${formatDate(deliveryForecast.worstCaseDate)} · ${deliveryForecast.rationale}` : deliveryForecast.rationale} tone={deliveryForecast.state === 'forecast' ? 'blue' : 'neutral'} />
                <MetricCard label="On-time probability" value={deliveryForecast.probability == null ? '—' : `${deliveryForecast.probability}%`} detail="Heuristic based on recent completion rate, remaining scope, and blockers" tone={deliveryForecast.probability == null ? 'neutral' : deliveryForecast.probability >= 65 ? 'green' : deliveryForecast.probability >= 35 ? 'amber' : 'red'} />
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

          <Section id="program-controls" title="PMO Controls" description="Change history, governance gates, dependencies, and accountable actions for release oversight.">
            <div style={twoColumnStyle}>
              <div style={confidenceCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                  <div>
                    <div style={subsectionTitleStyle}>Release readiness</div>
                    <div style={rowMetaStyle}>{readiness.failCount || 0} failed gates · {readiness.warningCount || 0} warnings</div>
                  </div>
                  <StatusPill tone={readinessTone(readiness.recommendation)}>{readinessLabel(readiness.recommendation)}</StatusPill>
                </div>
                <div style={{ marginTop: 14 }}>
                  {(readiness.gates || []).map((gate) => (
                    <div key={gate.id} style={compactControlRowStyle}>
                      <div>
                        <div style={rowTitleStyle}>{gate.name}</div>
                        <div style={rowMetaStyle}>{gate.detail}</div>
                      </div>
                      <StatusPill tone={gateTone(gate.status)}>{gate.status}</StatusPill>
                    </div>
                  ))}
                </div>
              </div>
              <div style={confidenceCardStyle}>
                <div style={subsectionTitleStyle}>Confidence and scope trend</div>
                <ConfidenceTrend history={releaseTrend.history} />
                <div style={{ ...compactMetricGridStyle, marginTop: 14 }}>
                  <MetricCard label="Confidence change" value={formatDelta(releaseTrend.confidenceDelta, ' pts')} detail={releaseTrend.hasBaseline ? `Since ${formatTimestamp(releaseTrend.previousCapturedAt)}` : 'Baseline created by this readout'} tone={releaseTrend.confidenceDelta > 0 ? 'green' : releaseTrend.confidenceDelta < 0 ? 'red' : 'neutral'} />
                  <MetricCard label="Completed change" value={formatDelta(releaseTrend.completedDelta)} detail="Since previous snapshot" tone={releaseTrend.completedDelta > 0 ? 'green' : 'neutral'} />
                  <MetricCard label="New blockers" value={formatDelta(releaseTrend.blockedDelta)} detail="Net blocker change" tone={releaseTrend.blockedDelta > 0 ? 'red' : releaseTrend.blockedDelta < 0 ? 'green' : 'neutral'} />
                  <MetricCard label="Scope churn" value={(releaseTrend.addedIssueKeys?.length || 0) + (releaseTrend.removedIssueKeys?.length || 0)} detail={`${releaseTrend.addedIssueKeys?.length || 0} added · ${releaseTrend.removedIssueKeys?.length || 0} removed`} tone={(releaseTrend.addedIssueKeys?.length || 0) ? 'amber' : 'neutral'} />
                </div>
                {releaseTrend.targetDateChanged ? (
                  <div style={warningCalloutStyle}>Target date changed from {formatDate(releaseTrend.previousTargetDate)} to {formatDate(releaseSnapshot.targetDate)}.</div>
                ) : null}
                {(releaseTrend.addedIssueKeys?.length || releaseTrend.removedIssueKeys?.length) ? (
                  <div style={evidenceListStyle}>
                    {(releaseTrend.addedIssueKeys || []).map((key) => <a key={`added-${key}`} href={jiraUrl(key)} target="_blank" rel="noreferrer" style={evidenceLinkStyle}>+ {key}</a>)}
                    {(releaseTrend.removedIssueKeys || []).map((key) => <a key={`removed-${key}`} href={jiraUrl(key)} target="_blank" rel="noreferrer" style={{ ...evidenceLinkStyle, color: COLORS.red, background: COLORS.redSoft }}>− {key}</a>)}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ ...twoColumnStyle, marginTop: 20 }}>
              <div>
                <div style={subsectionTitleStyle}>RAID and decision register ({raidRegister.length})</div>
                {raidRegister.length ? raidRegister.map((entry) => (
                  <div key={entry.id} style={controlCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={rowTitleStyle}>{entry.title}</div>
                        <div style={rowMetaStyle}>{entry.owner} · {entry.status}{entry.dueDate ? ` · Due ${formatDate(entry.dueDate)}` : ''}</div>
                      </div>
                      <StatusPill tone={toneForRisk(entry.severity)}>{entry.type}</StatusPill>
                    </div>
                    {entry.impact ? <div style={riskImpactStyle}><strong>Impact:</strong> {entry.impact}</div> : null}
                    {entry.action ? <div style={riskImpactStyle}><strong>Next action:</strong> {entry.action}</div> : null}
                    {entry.sourceUrl ? <a href={entry.sourceUrl} target="_blank" rel="noreferrer" style={{ ...sourceLinkStyle, display: 'inline-block', marginTop: 10 }}>Open evidence</a> : null}
                  </div>
                )) : <EmptyState>No RAID or decision entries were derived from the current evidence.</EmptyState>}
              </div>
              <div>
                <div style={subsectionTitleStyle}>Dependency criticality ({dependencySignals.length})</div>
                {dependencySignals.length ? dependencySignals.map((dependency) => (
                  <div key={dependency.id} style={controlCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={rowTitleStyle}>{dependency.sourceKey} {dependency.relationship} {dependency.targetKey}</div>
                        <div style={rowMetaStyle}>{dependency.owner} · Target {dependency.targetStatus}{dependency.externalToRelease ? ' · Outside release scope' : ''}</div>
                      </div>
                      <StatusPill tone={dependency.criticality === 'critical' ? 'red' : dependency.criticality === 'watch' ? 'amber' : 'green'}>{dependency.criticality}</StatusPill>
                    </div>
                    <div style={evidenceListStyle}>
                      <a href={dependency.sourceUrl || jiraUrl(dependency.sourceKey)} target="_blank" rel="noreferrer" style={evidenceLinkStyle}>{dependency.sourceKey}</a>
                      <a href={dependency.targetUrl || jiraUrl(dependency.targetKey)} target="_blank" rel="noreferrer" style={evidenceLinkStyle}>{dependency.targetKey}</a>
                    </div>
                  </div>
                )) : <EmptyState>No Jira issue dependencies were found in the selected release.</EmptyState>}
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
              <SourceCard
                name="Slack"
                state={cardStates.slack}
                detail={sourceLinks.slack?.error || (sourceLinks.slack?.conversationIds?.length
                  ? `${slackItems.length} recent messages from ${sourceLinks.slack.conversationIds.length} selected conversations`
                  : 'No Slack conversations selected')}
                refreshedAt={sourceLinks.slack?.lastRefresh}
              />
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
              <summary style={detailsSummaryStyle}>View Slack source lineage ({slackItems.length} messages)</summary>
              <div style={{ marginTop: 12 }}>
                {slackItems.length ? slackItems.map((item) => (
                  <div key={`slack-${item.id}`} style={sourceRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={rowTitleStyle}>{item.text || 'Message text unavailable'}</div>
                      <div style={rowMetaStyle}>{item.conversationId} · {formatTimestamp(item.timestamp)} · Author {item.authorId}</div>
                    </div>
                    {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>Open conversation</a> : <span style={rowMetaStyle}>Link unavailable</span>}
                  </div>
                )) : <EmptyState>No Slack messages were included in this analysis.</EmptyState>}
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
const trendChartStyle = { width: '100%', height: 150, display: 'block', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 8, marginTop: 10 };
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
const snapshotLibraryStyle = { ...scopePanelStyle, alignItems: 'flex-start', borderColor: '#85b8ff', background: '#f7fbff' };
const snapshotWorkspaceStyle = { display: 'grid', gap: 12, flex: '1 1 760px' };
const snapshotOpenStyle = { display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) auto auto', alignItems: 'end', gap: 10 };
const snapshotSaveStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(280px, 1.2fr) auto', alignItems: 'end', gap: 10, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` };
const savedSnapshotBannerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 14, borderRadius: 10, color: COLORS.ink, background: COLORS.blueSoft, border: '1px solid #85b8ff' };
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
const compactControlRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: `1px solid ${COLORS.border}` };
const controlCardStyle = { padding: 15, border: `1px solid ${COLORS.border}`, borderRadius: 10, background: '#fafbfc', marginBottom: 10 };
const warningCalloutStyle = { marginTop: 12, padding: '10px 12px', color: COLORS.amber, background: COLORS.amberSoft, borderRadius: 8, fontSize: 12, fontWeight: 700 };
const detailsStyle = { marginTop: 14, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '12px 14px', background: '#fafbfc' };
const detailsSummaryStyle = { cursor: 'pointer', fontWeight: 700, color: COLORS.ink };
const sourceRowStyle = { ...listRowStyle, paddingRight: 14 };
const emptyStateStyle = { padding: 16, border: '1px dashed #b3b9c4', borderRadius: 9, color: COLORS.muted, background: '#fafbfc', lineHeight: 1.5 };
const preStyle = { whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 14, borderRadius: 9, background: '#f1f2f4', color: COLORS.ink, border: 0 };
const errorStyle = { marginBottom: 18, borderRadius: 10, border: '1px solid #f15b50', background: COLORS.redSoft, color: COLORS.red, padding: '14px 16px' };
const successStyle = { borderRadius: 8, border: '1px solid #4bce97', background: COLORS.greenSoft, color: COLORS.green, padding: '10px 12px', fontSize: 12, fontWeight: 700 };
const primaryButtonStyle = { minHeight: 40, borderRadius: 9, border: `1px solid ${COLORS.blue}`, background: COLORS.blue, color: '#fff', padding: '0 16px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' };
const secondaryButtonStyle = { ...primaryButtonStyle, borderColor: COLORS.border, background: '#fff', color: COLORS.ink };
const dangerButtonStyle = { ...secondaryButtonStyle, borderColor: '#f15b50', color: COLORS.red };
