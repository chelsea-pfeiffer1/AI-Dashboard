import React from 'react';
import useDashboardData from './hooks/useDashboardData';
import { buildDashboardViewModel } from './domain/dashboardViewModel';
import { isActiveStatus, isBlockedStatus, isDoneStatus } from './domain/statusRules';

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

const DASHBOARD_VIEW_STORAGE_KEY = 'forge-ai-dashboard-role-view-v1';
const DASHBOARD_VIEWS = {
  executive: {
    label: 'Executive View',
    description: 'Readiness, confidence, risks, decisions, and forecast'
  },
  team: {
    label: 'Team / PMO View',
    description: 'Delivery controls, exceptions, flow, ownership, and issue detail'
  }
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
  return isDoneStatus(status);
}

function isActive(status) {
  return isActiveStatus(status);
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

function readStoredDashboardView() {
  if (typeof window === 'undefined') return 'executive';
  try {
    const storedView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
    return DASHBOARD_VIEWS[storedView] ? storedView : 'executive';
  } catch {
    return 'executive';
  }
}

function isPastDue(record) {
  if (!record?.dueDate || isDone(record.status)) return false;
  const dueDate = new Date(`${record.dueDate}T23:59:59`);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function isBug(record) {
  return /bug/i.test(String(record?.issueType || ''));
}

function isHighPriority(record) {
  return /highest|critical|blocker|high/i.test(String(record?.priority || ''));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function snapshotFileName(title) {
  const normalized = String(title || 'release-snapshot')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${normalized || 'release-snapshot'}.html`;
}

function buildSnapshotHtml(snapshot, dashboard) {
  const records = Array.isArray(dashboard?.records) ? dashboard.records : [];
  const risks = Array.isArray(dashboard?.aiAnalysis?.risks) ? dashboard.aiAnalysis.risks : [];
  const raidEntries = Array.isArray(dashboard?.raidRegister) ? dashboard.raidRegister : [];
  const dependencies = Array.isArray(dashboard?.dependencySignals) ? dashboard.dependencySignals : [];
  const readinessGates = Array.isArray(dashboard?.readiness?.gates) ? dashboard.readiness.gates : [];
  const completed = records.filter((record) => isDone(record.status)).length;
  const completionPercent = records.length ? Math.round((completed / records.length) * 100) : 0;
  const confidence = dashboard?.aiAnalysis?.confidence;

  const listItems = (items, render) => items.length
    ? items.map((item, index) => `<li>${render(item, index)}</li>`).join('')
    : '<li class="empty">None reported.</li>';

  const issueRows = records.length
    ? records.map((record) => `
      <tr>
        <td><a href="${escapeHtml(record.sourceLink || jiraUrl(record.issueKey))}">${escapeHtml(record.issueKey)}</a></td>
        <td>${escapeHtml(record.summary)}</td>
        <td>${escapeHtml(record.status)}</td>
        <td>${escapeHtml(record.owner)}</td>
        <td>${escapeHtml(record.priority)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="empty">No Jira issues were saved in this snapshot.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(snapshot?.title || 'Release snapshot')}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Arial, sans-serif; color: #172b4d; background: #f4f5f7; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: auto; }
    header, section { background: white; border: 1px solid #dfe1e6; border-radius: 12px; padding: 22px; margin-bottom: 18px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    h3 { margin-bottom: 6px; }
    p, li { line-height: 1.5; }
    .muted, .empty { color: #626f86; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .metric { background: #f7f8f9; border-radius: 9px; padding: 14px; }
    .metric strong { display: block; font-size: 25px; margin-top: 5px; }
    .gate { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid #dfe1e6; padding: 10px 0; }
    .pill { display: inline-block; border-radius: 999px; padding: 4px 8px; background: #e9f2ff; color: #0c66e4; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; border-bottom: 1px solid #dfe1e6; padding: 10px 8px; vertical-align: top; }
    a { color: #0c66e4; }
    @media print { body { padding: 0; background: white; } header, section { break-inside: avoid; } }
  </style>
</head>
<body>
<main>
  <header>
    <div class="pill">Saved executive snapshot</div>
    <h1>${escapeHtml(snapshot?.title || 'Release snapshot')}</h1>
    ${snapshot?.note ? `<p>${escapeHtml(snapshot.note)}</p>` : ''}
    <p class="muted">Saved ${escapeHtml(formatTimestamp(snapshot?.savedAt))} · Source data from ${escapeHtml(formatTimestamp(snapshot?.sourceRefreshedAt || dashboard?.summary?.refreshedAt))}</p>
    <p><strong>Release:</strong> ${escapeHtml(dashboard?.scope?.releaseId || 'Unknown')} · <strong>Team:</strong> ${escapeHtml(dashboard?.scope?.team || 'Unknown')} · <strong>Confluence:</strong> ${escapeHtml(dashboard?.scope?.confluenceRootTitle || dashboard?.scope?.confluenceSpaceKey || 'Unknown')}</p>
  </header>

  <section>
    <h2>Executive overview</h2>
    <div class="metrics">
      <div class="metric">Release scope<strong>${records.length}</strong></div>
      <div class="metric">Completed<strong>${completed} (${completionPercent}%)</strong></div>
      <div class="metric">Confidence<strong>${confidence?.score == null ? 'Unavailable' : `${escapeHtml(confidence.score)}%`}</strong></div>
      <div class="metric">Readiness<strong>${escapeHtml(readinessLabel(dashboard?.readiness?.recommendation))}</strong></div>
      <div class="metric">Target date<strong>${escapeHtml(formatDate(dashboard?.releaseSnapshot?.targetDate))}</strong></div>
      <div class="metric">Forecast<strong>${escapeHtml(formatDate(dashboard?.deliveryForecast?.expectedDate))}</strong></div>
    </div>
    <h3>Executive readout</h3>
    <p>${escapeHtml(dashboard?.aiSummary || dashboard?.aiStatus?.message || 'AI analysis was unavailable for this snapshot.')}</p>
    ${confidence?.rationale ? `<h3>Confidence rationale</h3><p>${escapeHtml(confidence.rationale)}</p>` : ''}
  </section>

  <section>
    <h2>Release readiness</h2>
    ${readinessGates.length ? readinessGates.map((gate) => `
      <div class="gate">
        <div><strong>${escapeHtml(gate.name)}</strong><div class="muted">${escapeHtml(gate.detail)}</div></div>
        <span class="pill">${escapeHtml(gate.status)}</span>
      </div>`).join('') : '<p class="empty">No readiness gates were saved.</p>'}
  </section>

  <section>
    <h2>Evidence-backed risks</h2>
    <ul>${listItems(risks, (risk) => `<strong>${escapeHtml(risk.title)}</strong> (${escapeHtml(risk.severity)}) — ${escapeHtml(risk.description)}${risk.recommendedAction ? `<br><strong>Action:</strong> ${escapeHtml(risk.recommendedAction)}` : ''}`)}</ul>
  </section>

  <section>
    <h2>RAID and decisions</h2>
    <ul>${listItems(raidEntries, (entry) => `<strong>${escapeHtml(entry.title)}</strong> — ${escapeHtml(entry.owner)} · ${escapeHtml(entry.status)}${entry.action ? `<br><strong>Action:</strong> ${escapeHtml(entry.action)}` : ''}`)}</ul>
  </section>

  <section>
    <h2>Dependencies</h2>
    <ul>${listItems(dependencies, (dependency) => `<strong>${escapeHtml(dependency.sourceKey)} ${escapeHtml(dependency.relationship)} ${escapeHtml(dependency.targetKey)}</strong> — ${escapeHtml(dependency.criticality)} · ${escapeHtml(dependency.targetStatus)}`)}</ul>
  </section>

  <section>
    <h2>Jira release scope</h2>
    <table>
      <thead><tr><th>Issue</th><th>Summary</th><th>Status</th><th>Owner</th><th>Priority</th></tr></thead>
      <tbody>${issueRows}</tbody>
    </table>
  </section>

  <section>
    <p class="muted">This is a frozen dashboard export. Confirm material decisions in the linked Jira and Confluence sources.</p>
  </section>
</main>
</body>
</html>`;
}

function downloadSnapshot(snapshot, dashboard) {
  const blob = new Blob([buildSnapshotHtml(snapshot, dashboard)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = snapshotFileName(snapshot?.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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

function JiraIssueLink({ issueKey, href, style = sourceLinkStyle, children }) {
  if (!issueKey) return null;
  return (
    <a
      href={href || jiraUrl(issueKey)}
      target="_blank"
      rel="noreferrer"
      style={style}
      title={`Open ${issueKey} in Jira`}
    >
      {children || issueKey}
    </a>
  );
}

function AiRiskCard({ risk }) {
  const affectedIssueKeys = Array.isArray(risk.affectedIssueKeys)
    ? [...new Set(risk.affectedIssueKeys.filter(Boolean))]
    : [];
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
      {affectedIssueKeys.length ? (
        <div style={evidenceListStyle}>
          {affectedIssueKeys.map((issueKey) => (
            <JiraIssueLink key={issueKey} issueKey={issueKey} style={evidenceLinkStyle} />
          ))}
        </div>
      ) : null}
      <div style={evidenceListStyle}>
        {(risk.evidence || []).map((evidence, index) => (
          (evidence.url || (String(evidence.sourceSystem).toLowerCase() === 'jira' && evidence.sourceId)) ? (
            <a key={`${evidence.sourceSystem}-${evidence.sourceId}-${index}`} href={evidence.url || jiraUrl(evidence.sourceId)} target="_blank" rel="noreferrer" style={evidenceLinkStyle}>
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

function OperationalIssueList({ title, records, emptyText, limit = 8 }) {
  const visibleRecords = records.slice(0, limit);
  return (
    <div style={operationalCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={subsectionTitleStyle}>{title}</div>
        <StatusPill tone={records.length ? 'amber' : 'green'}>{records.length}</StatusPill>
      </div>
      <div style={{ marginTop: 10 }}>
        {visibleRecords.length ? visibleRecords.map((record) => (
          <a
            key={`${title}-${record.issueKey}`}
            href={record.sourceLink || jiraUrl(record.issueKey)}
            target="_blank"
            rel="noreferrer"
            title={`Open ${record.issueKey} in Jira`}
            style={{ ...operationalIssueRowStyle, ...jiraItemRowLinkStyle }}
          >
            <div style={{ minWidth: 0 }}>
              <span style={sourceLinkStyle}>{record.issueKey}</span>
              <div style={operationalIssueSummaryStyle}>{record.summary}</div>
              <div style={rowMetaStyle}>
                {record.owner} · {record.status}{record.dueDate ? ` · Due ${formatDate(record.dueDate)}` : ''}
              </div>
            </div>
            <StatusPill tone={isBlockedStatus(record.status) ? 'red' : isPastDue(record) ? 'amber' : 'neutral'}>
              {record.priority}
            </StatusPill>
          </a>
        )) : <EmptyState>{emptyText}</EmptyState>}
      </div>
      {records.length > limit ? (
        <div style={{ ...rowMetaStyle, marginTop: 10 }}>{records.length - limit} additional issues appear in the complete Jira issue list below.</div>
      ) : null}
    </div>
  );
}

function TeamPmoDashboardContent({ dashboard }) {
  const viewModel = buildDashboardViewModel(dashboard);
  const {
    records, total, completed, active, blocked, completionPercent, releaseSnapshot
  } = viewModel;
  const dependencySignals = Array.isArray(dashboard?.dependencySignals) ? dashboard.dependencySignals : [];
  const incompleteRecords = records.filter((record) => !isDone(record.status));
  const blockedRecords = incompleteRecords.filter((record) => isBlockedStatus(record.status));
  const overdueRecords = incompleteRecords.filter(isPastDue);
  const missingDueDateRecords = incompleteRecords.filter((record) => !record.dueDate);
  const openBugRecords = incompleteRecords.filter(isBug);
  const highPriorityRecords = incompleteRecords.filter(isHighPriority);

  const statusGroups = Array.from(records.reduce((groups, record) => {
    const status = String(record.status || 'Unknown');
    groups.set(status, (groups.get(status) || 0) + 1);
    return groups;
  }, new Map()).entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const ownerGroups = Array.from(records.reduce((groups, record) => {
    const owner = String(record.owner || 'Unassigned');
    const current = groups.get(owner) || { name: owner, total: 0, incomplete: 0, blocked: 0, overdue: 0 };
    current.total += 1;
    if (!isDone(record.status)) current.incomplete += 1;
    if (isBlockedStatus(record.status)) current.blocked += 1;
    if (isPastDue(record)) current.overdue += 1;
    groups.set(owner, current);
    return groups;
  }, new Map()).values())
    .sort((a, b) => b.incomplete - a.incomplete || b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 15);

  const workstreams = Array.isArray(dashboard?.workstreams) ? dashboard.workstreams : [];

  return (
    <>
      <Section id="team-overview" title="Operational overview" description="The current Jira delivery picture for the team and PMO.">
        <div style={metricGridStyle}>
          <MetricCard label="Release scope" value={total} detail="Stories and bugs" tone="blue" />
          <MetricCard label="Completed" value={`${completionPercent}%`} detail={`${completed} of ${total}`} tone="green" />
          <MetricCard label="In motion" value={active} detail="In progress or review" tone="blue" />
          <MetricCard label="Blocked" value={blocked} detail="Work currently stopped" tone={blocked ? 'red' : 'neutral'} />
          <MetricCard label="Past due" value={overdueRecords.length} detail="Incomplete issues past due" tone={overdueRecords.length ? 'red' : 'green'} />
          <MetricCard label="Open bugs" value={openBugRecords.length} detail="Incomplete bugs in release scope" tone={openBugRecords.length ? 'amber' : 'green'} />
          <MetricCard label="Missing due date" value={missingDueDateRecords.length} detail="Incomplete work without a due date" tone={missingDueDateRecords.length ? 'amber' : 'green'} />
          <MetricCard label="Dependencies" value={dependencySignals.length} detail="Linked delivery relationships" tone={dependencySignals.length ? 'blue' : 'neutral'} />
        </div>
        <div style={{ ...summaryCalloutStyle, marginTop: 18 }}>
          <div style={calloutLabelStyle}>Release timing</div>
          <div style={summaryStyle}>
            Target {formatDate(releaseSnapshot.targetDate)} · {releaseTimingDetail(releaseSnapshot)}
          </div>
        </div>
      </Section>

      <Section id="delivery-controls" title="Delivery controls" description="Exception queues that need team or PMO attention.">
        <div style={twoColumnStyle}>
          <OperationalIssueList title="Blocked work" records={blockedRecords} emptyText="No incomplete issues are currently blocked." />
          <OperationalIssueList title="Past-due work" records={overdueRecords} emptyText="No incomplete issues are currently past due." />
          <OperationalIssueList title="Missing due dates" records={missingDueDateRecords} emptyText="Every incomplete issue has a due date." />
          <OperationalIssueList title="Open bugs" records={openBugRecords} emptyText="No open bugs are present in the selected release scope." />
          <OperationalIssueList title="High-priority open work" records={highPriorityRecords} emptyText="No high-priority incomplete issues were returned." />
        </div>
      </Section>

      <Section id="flow-ownership" title="Flow and ownership" description="Where the release work sits and who currently owns it.">
        <div style={threeColumnStyle}>
          <div style={operationalCardStyle}>
            <div style={subsectionTitleStyle}>Status distribution</div>
            <div style={{ marginTop: 10 }}>
              {statusGroups.length ? statusGroups.map((group) => (
                <div key={group.name} style={compactControlRowStyle}>
                  <div>
                    <div style={rowTitleStyle}>{group.name}</div>
                    <div style={rowMetaStyle}>{total ? Math.round((group.count / total) * 100) : 0}% of scope</div>
                  </div>
                  <StatusPill tone={isDone(group.name) ? 'green' : isBlockedStatus(group.name) ? 'red' : isActive(group.name) ? 'blue' : 'neutral'}>
                    {group.count}
                  </StatusPill>
                </div>
              )) : <EmptyState>Generate a readout to see status distribution.</EmptyState>}
            </div>
          </div>

          <div style={operationalCardStyle}>
            <div style={subsectionTitleStyle}>Workstreams</div>
            <div style={{ marginTop: 10 }}>
              {workstreams.length ? workstreams.map((workstream) => (
                <div key={workstream.name} style={compactControlRowStyle}>
                  <div>
                    <div style={rowTitleStyle}>{workstream.name}</div>
                    <div style={rowMetaStyle}>{workstream.blocked || 0} blocked · {workstream.highRisk || 0} high risk</div>
                  </div>
                  <StatusPill tone={workstream.blocked ? 'red' : workstream.highRisk ? 'amber' : 'blue'}>
                    {workstream.total}
                  </StatusPill>
                </div>
              )) : <EmptyState>No workstream data is available.</EmptyState>}
            </div>
          </div>

          <div style={operationalCardStyle}>
            <div style={subsectionTitleStyle}>Owner workload</div>
            <div style={{ marginTop: 10 }}>
              {ownerGroups.length ? ownerGroups.map((owner) => (
                <div key={owner.name} style={compactControlRowStyle}>
                  <div>
                    <div style={rowTitleStyle}>{owner.name}</div>
                    <div style={rowMetaStyle}>{owner.incomplete} open · {owner.blocked} blocked · {owner.overdue} overdue</div>
                  </div>
                  <StatusPill tone={owner.blocked ? 'red' : owner.overdue ? 'amber' : 'neutral'}>
                    {owner.total}
                  </StatusPill>
                </div>
              )) : <EmptyState>No ownership data is available.</EmptyState>}
            </div>
          </div>
        </div>
      </Section>

      <Section id="team-issues" title="Jira release issues" description="Complete operational issue list with direct links to Jira.">
        <div>
          {records.length ? records.map((record) => (
            <a
              key={`team-${record.issueKey}`}
              href={record.sourceLink || jiraUrl(record.issueKey)}
              target="_blank"
              rel="noreferrer"
              title={`Open ${record.issueKey} in Jira`}
              style={{ ...sourceRowStyle, ...jiraItemRowLinkStyle }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={sourceLinkStyle}>{record.issueKey}</span>
                <div style={{ ...rowTitleStyle, marginTop: 4 }}>{record.summary}</div>
                <div style={rowMetaStyle}>
                  {record.owner} · {record.priority}{record.dueDate ? ` · Due ${formatDate(record.dueDate)}` : ' · Due date missing'}
                </div>
              </div>
              <StatusPill tone={isDone(record.status) ? 'green' : isBlockedStatus(record.status) ? 'red' : isActive(record.status) ? 'blue' : 'neutral'}>
                {record.status}
              </StatusPill>
            </a>
          )) : <EmptyState>No Jira issues were returned for this release.</EmptyState>}
        </div>
      </Section>
    </>
  );
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
  const [contentUrl, setContentUrl] = React.useState(config?.confluenceContentUrl || '');

  React.useEffect(() => {
    setReleaseId(config?.releaseId || '');
    setSpaceKey(config?.confluenceSpaceKey || '');
    setContentUrl(config?.confluenceContentUrl || '');
  }, [config?.releaseId, config?.confluenceSpaceKey, config?.confluenceContentUrl]);

  const submit = (event) => {
    event.preventDefault();
    const nextRelease = releaseId.trim();
    const nextSpace = spaceKey.trim();
    const nextContentUrl = contentUrl.trim();
    if (!nextRelease || !nextSpace) return;
    onApply({
      releaseId: nextRelease,
      confluenceSpaceKey: nextSpace,
      confluenceContentUrl: nextContentUrl
    });
  };

  return (
    <form onSubmit={submit} style={scopePanelStyle}>
      <div style={{ minWidth: 220 }}>
        <div style={scopeTitleStyle}>Readout scope</div>
        <div style={scopeHelpStyle}>Choose the Jira release and Confluence source for the AI analysis.</div>
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
        <label style={{ ...fieldLabelStyle, gridColumn: 'span 2' }}>
          <span>Confluence folder or parent-page URL (optional)</span>
          <input
            type="url"
            value={contentUrl}
            onChange={(event) => setContentUrl(event.target.value)}
            placeholder="Paste the folder or parent-page URL from Confluence"
            style={inputStyle}
          />
          <span style={fieldHelpStyle}>When supplied, only that page or folder and its descendant pages are analyzed.</span>
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
  onDownload,
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
          Open a frozen status view by name—no Jira release or Confluence space selection required.
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" style={primaryButtonStyle} onClick={onDownload}>Download snapshot</button>
              <button type="button" style={secondaryButtonStyle} onClick={onClose}>Return to live setup</button>
            </div>
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
  const [activeView, setActiveView] = React.useState(readStoredDashboardView);
  const hasSelectedScope = Boolean(config?.releaseId && config?.confluenceSpaceKey);
  const summary = dashboard?.summary || {};
  const metrics = dashboard?.metrics || {};
  const aiAnalysis = dashboard?.aiAnalysis || null;
  const aiStatus = dashboard?.aiStatus || {};
  const analysisAvailable = Boolean(aiAnalysis && metrics.analysisAvailable);
  const canSaveSnapshot = Boolean(
    !activeSnapshot
    && summary.refreshedAt
    && dashboard?.scope?.releaseId
    && analysisAvailable
    && aiStatus.state === 'loaded'
  );
  const suggestedSnapshotTitle = canSaveSnapshot
    ? `${dashboard.scope.releaseId} · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}`
    : '';
  const sectionLinks = activeView === 'team'
    ? [
      ['team-overview', 'Operational overview'],
      ['delivery-controls', 'Delivery controls'],
      ['flow-ownership', 'Flow & ownership'],
      ['team-issues', 'Jira issues']
    ]
    : [
      ['overview', 'Release overview'],
      ['risks-actions', 'AI risks & actions'],
      ['supporting-details', 'Supporting details']
    ];

  const selectView = (nextView) => {
    if (!DASHBOARD_VIEWS[nextView]) return;
    setActiveView(nextView);
    try {
      window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, nextView);
    } catch {
      // Ignore storage failures in restricted Forge browser contexts.
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
                <span>Confluence {dashboard?.scope?.confluenceRootTitle || dashboard?.scope?.confluenceSpaceKey || config?.confluenceSpaceKey || 'Unknown space'}</span>
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

          <nav style={viewNavigationStyle} aria-label="Dashboard role views">
            {Object.entries(DASHBOARD_VIEWS).map(([viewId, view]) => {
              const selected = activeView === viewId;
              return (
                <button
                  key={viewId}
                  type="button"
                  onClick={() => selectView(viewId)}
                  style={{
                    ...viewNavigationButtonStyle,
                    ...(selected ? viewNavigationButtonActiveStyle : {})
                  }}
                  aria-pressed={selected}
                >
                  <span style={viewNavigationLabelStyle}>{view.label}</span>
                  <span style={{ ...viewNavigationDescriptionStyle, color: selected ? '#deebff' : COLORS.muted }}>
                    {view.description}
                  </span>
                </button>
              );
            })}
          </nav>

          <nav style={navStyle} aria-label="Dashboard sections">
            {sectionLinks.map(([id, label]) => (
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

          {(activeView === 'executive' || activeSnapshot) ? (
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
              onDownload={() => downloadSnapshot(activeSnapshot, dashboard)}
              onClose={closeSnapshot}
            />
          ) : null}

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

          {activeView === 'team'
            ? <TeamPmoDashboardContent dashboard={dashboard} />
            : <DashboardContent dashboard={dashboard} config={config} />}
        </div>
      </div>
    </AppErrorBoundary>
  );
}

function DashboardContent({ dashboard, config }) {
  const {
    summary, metrics, releaseSnapshot, releaseTrend, readiness, deliveryForecast,
    sourceLinks, cardStates, records, actions, confluenceItems, raidRegister,
    aiAnalysis, aiStatus, aiRisks, analysisAvailable, total, completed, active,
    blocked, completionPercent, confidenceScore, confidenceLabel, confidenceTone,
    warningGates, additionalDependencies
  } = buildDashboardViewModel(dashboard);

  return (
    <>
      <Section id="overview" title="Release overview" description="The release decision in one place.">
        <div style={metricGridStyle}>
          <MetricCard label="Release scope" value={total} detail="Stories and bugs" tone="blue" />
          <MetricCard label="Completed" value={`${completionPercent}%`} detail={`${completed} of ${total}`} tone="green" />
          <MetricCard label="In motion" value={active} detail="In progress or review" tone="blue" />
          <MetricCard label="Blocked issues" value={blocked} detail="Jira items currently stopped" tone={blocked ? 'red' : 'neutral'} />
          <MetricCard label="Target release" value={formatDate(releaseSnapshot.targetDate)} detail={releaseTimingDetail(releaseSnapshot)} tone={releaseSnapshot.scheduleDataAvailable ? 'blue' : 'neutral'} />
          <MetricCard label="AI confidence" value={analysisAvailable ? `${confidenceScore}%` : '—'} detail={confidenceLabel} tone={confidenceTone} />
        </div>

        <div style={summaryCalloutStyle}>
          <div style={calloutLabelStyle}>Executive readout</div>
          <div style={summaryStyle}>{dashboard?.aiSummary || aiStatus.message || 'AI analysis is not available yet.'}</div>
        </div>

        <div style={{ ...twoColumnStyle, marginTop: 18 }}>
          <div style={confidenceCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
              <div>
                <div style={subsectionTitleStyle}>Release readiness</div>
                <div style={rowMetaStyle}>{readiness.failCount || 0} failed gates · {readiness.warningCount || 0} warnings</div>
              </div>
              <StatusPill tone={readinessTone(readiness.recommendation)}>{readinessLabel(readiness.recommendation)}</StatusPill>
            </div>
            <div style={{ marginTop: 12 }}>
              {warningGates.length ? warningGates.map((gate) => (
                <div key={gate.id} style={compactControlRowStyle}>
                  <div>
                    <div style={rowTitleStyle}>{gate.name}</div>
                    <div style={rowMetaStyle}>{gate.detail}</div>
                  </div>
                  <StatusPill tone={gateTone(gate.status)}>{gate.status}</StatusPill>
                </div>
              )) : <EmptyState>All release readiness gates currently pass.</EmptyState>}
            </div>
          </div>
          <div style={confidenceCardStyle}>
            <div style={subsectionTitleStyle}>Confidence rationale</div>
            <div style={summaryStyle}>{aiAnalysis?.confidence?.rationale || aiStatus.message || 'Waiting for AI analysis.'}</div>
            <div style={{ marginTop: 16 }}><ProgressBar value={confidenceScore} tone={confidenceTone} /></div>
          </div>
        </div>
      </Section>

      <Section id="risks-actions" title="AI risks and actions" description="Evidence-backed concerns, decisions, dependencies, and next actions.">
        <div style={metricGridStyle}>
          <MetricCard label="High risk" value={analysisAvailable ? metrics.highRisk : '—'} tone={analysisAvailable && metrics.highRisk ? 'red' : 'neutral'} />
          <MetricCard label="Medium risk" value={analysisAvailable ? metrics.mediumRisk : '—'} tone={analysisAvailable && metrics.mediumRisk ? 'amber' : 'neutral'} />
          <MetricCard label="Decisions needed" value={analysisAvailable ? metrics.decisionsNeeded : '—'} tone={analysisAvailable && metrics.decisionsNeeded ? 'amber' : 'neutral'} />
        </div>

        <div style={{ ...twoColumnStyle, marginTop: 20 }}>
          <div>
            <div style={subsectionTitleStyle}>Evidence-backed risks</div>
            {aiRisks.length ? aiRisks.map((risk) => <AiRiskCard key={risk.id} risk={risk} />) : (
              <EmptyState>{analysisAvailable ? 'No evidence-supported risks were identified.' : aiStatus.message || 'AI risk analysis is unavailable.'}</EmptyState>
            )}
          </div>
          <div>
            <div style={subsectionTitleStyle}>Recommended actions</div>
            {actions.length ? actions.map((action, index) => (
              <div key={`${action.issueKey || action.summary}-${index}`} style={listRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <div style={rowTitleStyle}>{action.summary}</div>
                  <div style={rowMetaStyle}>{action.owner} · {action.status}</div>
                </div>
                {(action.sourceUrl || action.issueKey) ? (
                  action.issueKey
                    ? <JiraIssueLink issueKey={action.issueKey} href={action.sourceUrl} />
                    : <a href={action.sourceUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>Evidence</a>
                ) : null}
              </div>
            )) : <EmptyState>No decision or action items were detected.</EmptyState>}
          </div>
        </div>

        <details style={detailsStyle} open={Boolean(raidRegister.length || additionalDependencies.length)}>
          <summary style={detailsSummaryStyle}>Risks and dependencies ({raidRegister.length + additionalDependencies.length})</summary>
          <div style={{ ...twoColumnStyle, marginTop: 14 }}>
            {raidRegister.map((entry) => (
              <div key={entry.id} style={controlCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={rowTitleStyle}>{entry.title}</div>
                    <div style={rowMetaStyle}>{entry.owner} · {entry.status}{entry.dueDate ? ` · Due ${formatDate(entry.dueDate)}` : ''}</div>
                  </div>
                  <StatusPill tone={toneForRisk(entry.severity)}>{entry.type}</StatusPill>
                </div>
                {entry.action ? <div style={riskImpactStyle}><strong>Next action:</strong> {entry.action}</div> : null}
                {entry.issueKeys?.length ? (
                  <div style={evidenceListStyle}>
                    {entry.issueKeys.map((issueKey) => (
                      <JiraIssueLink key={`${entry.id}-${issueKey}`} issueKey={issueKey} style={evidenceLinkStyle} />
                    ))}
                  </div>
                ) : null}
                {entry.sourceUrl ? <a href={entry.sourceUrl} target="_blank" rel="noreferrer" style={{ ...sourceLinkStyle, display: 'inline-block', marginTop: 10 }}>Open evidence</a> : null}
              </div>
            ))}
            {additionalDependencies.map((dependency) => (
              <div key={dependency.id} style={controlCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={rowTitleStyle}>{dependency.sourceKey} {dependency.relationship} {dependency.targetKey}</div>
                    <div style={rowMetaStyle}>{dependency.owner} · Target {dependency.targetStatus}{dependency.externalToRelease ? ' · Outside release scope' : ''}</div>
                  </div>
                  <StatusPill tone={dependency.criticality === 'critical' ? 'red' : dependency.criticality === 'watch' ? 'amber' : 'green'}>{dependency.criticality}</StatusPill>
                </div>
                <div style={evidenceListStyle}>
                  <JiraIssueLink issueKey={dependency.sourceKey} href={dependency.sourceUrl} style={evidenceLinkStyle} />
                  <JiraIssueLink issueKey={dependency.targetKey} href={dependency.targetUrl} style={evidenceLinkStyle} />
                </div>
              </div>
            ))}
            {!raidRegister.length && !additionalDependencies.length ? <EmptyState>No risks or dependencies were found.</EmptyState> : null}
          </div>
        </details>
      </Section>

      <Section id="supporting-details" title="Supporting details" description="Issue evidence, forecast, trends, and diagnostics when you need to investigate.">
        <details style={detailsStyle}>
          <summary style={detailsSummaryStyle}>Jira release issues ({records.length})</summary>
          <div style={{ marginTop: 12 }}>
            {records.length ? records.map((record) => (
              <a
                key={record.issueKey}
                href={record.sourceLink || jiraUrl(record.issueKey)}
                target="_blank"
                rel="noreferrer"
                title={`Open ${record.issueKey} in Jira`}
                style={{ ...sourceRowStyle, ...jiraItemRowLinkStyle }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={sourceLinkStyle}>{record.issueKey}</span>
                  <div style={{ ...rowTitleStyle, marginTop: 4 }}>{record.summary}</div>
                  <div style={rowMetaStyle}>{record.owner} · {record.priority}{record.dueDate ? ` · Due ${formatDate(record.dueDate)}` : ''}</div>
                </div>
                <StatusPill tone={isDone(record.status) ? 'green' : isBlockedStatus(record.status) ? 'red' : isActive(record.status) ? 'blue' : 'neutral'}>{record.status}</StatusPill>
              </a>
            )) : <EmptyState>No Jira issues were returned for this release.</EmptyState>}
          </div>
        </details>

        <details style={detailsStyle}>
          <summary style={detailsSummaryStyle}>Forecast and release trend</summary>
          <div style={{ ...twoColumnStyle, marginTop: 14 }}>
            <div style={confidenceCardStyle}>
              <div style={subsectionTitleStyle}>Delivery forecast</div>
              <div style={compactMetricGridStyle}>
                <MetricCard label="Expected" value={deliveryForecast.expectedDate ? formatDate(deliveryForecast.expectedDate) : 'Insufficient data'} detail={deliveryForecast.rationale} tone={deliveryForecast.state === 'forecast' ? 'blue' : 'neutral'} />
                <MetricCard label="On-time probability" value={deliveryForecast.probability == null ? '—' : `${deliveryForecast.probability}%`} detail={deliveryForecast.bestCaseDate ? `${formatDate(deliveryForecast.bestCaseDate)} to ${formatDate(deliveryForecast.worstCaseDate)}` : 'No forecast range available'} tone={deliveryForecast.probability == null ? 'neutral' : deliveryForecast.probability >= 65 ? 'green' : deliveryForecast.probability >= 35 ? 'amber' : 'red'} />
              </div>
            </div>
            <div style={confidenceCardStyle}>
              <div style={subsectionTitleStyle}>Confidence trend</div>
              <ConfidenceTrend history={releaseTrend.history} />
              <div style={rowMetaStyle}>Confidence {formatDelta(releaseTrend.confidenceDelta, ' pts')} · Completed {formatDelta(releaseTrend.completedDelta)} · Blockers {formatDelta(releaseTrend.blockedDelta)}</div>
            </div>
          </div>
        </details>

        <details style={detailsStyle}>
          <summary style={detailsSummaryStyle}>Diagnostics and source evidence</summary>
          <div style={{ ...threeColumnStyle, marginTop: 14 }}>
            <SourceCard name="Jira" state={cardStates.jira} detail={`${summary.total || total} release items`} refreshedAt={sourceLinks.jira?.lastRefresh} />
            <SourceCard name="Confluence" state={cardStates.confluence} detail={sourceLinks.confluence?.error || `${confluenceItems.length} items from ${sourceLinks.confluence?.pageTitle || sourceLinks.confluence?.spaceKey || config?.confluenceSpaceKey}`} refreshedAt={sourceLinks.confluence?.lastRefresh} link={sourceLinks.confluence?.pageUrl} />
            <SourceCard name="AI analysis" state={cardStates.openai} detail={`${sourceLinks.openai?.model || 'Model unavailable'} · ${aiStatus.message || 'Status unavailable'}`} refreshedAt={sourceLinks.openai?.lastRefresh} />
          </div>

          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>Confluence source lineage ({confluenceItems.length})</summary>
            <div style={{ marginTop: 12 }}>
              {confluenceItems.length ? confluenceItems.map((item) => (
                <div key={`source-${item.type}-${item.id}`} style={{ ...sourceRowStyle, paddingLeft: 14 + Math.min(Number(item.depth || 0), 6) * 16 }}>
                  <div>
                    <div style={rowTitleStyle}>{item.title || 'Untitled'}</div>
                    <div style={rowMetaStyle}>{formatConfluenceType(item)} · ID {item.id}</div>
                  </div>
                  {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={sourceLinkStyle}>Open source</a> : null}
                </div>
              )) : <EmptyState>No Confluence source lineage is available.</EmptyState>}
            </div>
          </details>
          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>Jira query</summary>
            <pre style={{ ...preStyle, marginTop: 12 }}>{sourceLinks.jira?.jql || 'JQL unavailable'}</pre>
          </details>
          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>AI data gaps ({aiAnalysis?.dataGaps?.length || 0})</summary>
            <div style={{ marginTop: 12 }}>
              {aiAnalysis?.dataGaps?.length ? aiAnalysis.dataGaps.map((gap, index) => (
                <div key={`${gap}-${index}`} style={listRowStyle}>{gap}</div>
              )) : <EmptyState>No AI data gaps were reported.</EmptyState>}
            </div>
          </details>
          <details style={detailsStyle}>
            <summary style={detailsSummaryStyle}>All readiness gates ({readiness.gates?.length || 0})</summary>
            <div style={{ marginTop: 12 }}>
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
          </details>
        </details>
      </Section>
    </>
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
const viewNavigationStyle = { ...panelStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, padding: 10, marginBottom: 10 };
const viewNavigationButtonStyle = { display: 'grid', gap: 5, textAlign: 'left', padding: '14px 16px', border: `1px solid ${COLORS.border}`, borderRadius: 10, background: '#fff', color: COLORS.ink, cursor: 'pointer', fontFamily: 'inherit' };
const viewNavigationButtonActiveStyle = { borderColor: COLORS.blue, background: COLORS.blue, color: '#fff', boxShadow: '0 2px 5px rgba(12,102,228,0.22)' };
const viewNavigationLabelStyle = { fontSize: 15, fontWeight: 800 };
const viewNavigationDescriptionStyle = { fontSize: 11, fontWeight: 500, lineHeight: 1.4 };
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
const operationalCardStyle = { padding: 18, background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 12 };
const operationalIssueRowStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: `1px solid ${COLORS.border}` };
const operationalIssueSummaryStyle = { color: COLORS.ink, fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 3 };
const jiraItemRowLinkStyle = { color: 'inherit', textDecoration: 'none', cursor: 'pointer' };
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
const fieldHelpStyle = { color: '#626f86', fontSize: 11, fontWeight: 400, lineHeight: 1.35 };
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
