import { createDashboardTemplate } from '../templates/dashboardTemplate';

function normalizeLabel(value) {
  return String(value || '').trim().toLowerCase();
}

function toText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueByKey(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.key || item?.summary || item?.text;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function deriveRiskLabel(record) {
  const raw =
    record?.risk?.label ||
    record?.priority ||
    record?.severity ||
    record?.fields?.priority?.name ||
    record?.fields?.priority?.label ||
    '';

  const value = normalizeLabel(raw);

  if (['highest', 'critical', 'blocker', 'high'].includes(value)) return 'high';
  if (['medium', 'moderate', 'normal'].includes(value)) return 'medium';
  return 'low';
}

function deriveConfidenceLabel(record) {
  const raw =
    record?.confidence?.label ||
    record?.confidence ||
    record?.fields?.confidence ||
    record?.signals?.confidence ||
    '';

  const value = normalizeLabel(raw);

  if (['high', 'strong', 'green'].includes(value)) return 'high';
  if (['medium', 'amber', 'yellow'].includes(value)) return 'medium';
  return 'low';
}

function deriveStatus(record) {
  return (
    record?.status ||
    record?.fields?.status?.name ||
    record?.fields?.status ||
    record?.state ||
    'Unknown'
  );
}

function deriveOwner(record) {
  return (
    record?.owner ||
    record?.assignee ||
    record?.fields?.assignee?.displayName ||
    record?.fields?.assignee?.name ||
    'Unassigned'
  );
}

function deriveIssueType(record) {
  return (
    record?.issueType ||
    record?.fields?.issuetype?.name ||
    record?.fields?.issueType ||
    'Issue'
  );
}

function deriveSourceLink(record) {
  return (
    record?.sourceLink ||
    record?.htmlLink ||
    record?.fields?.url ||
    record?.self ||
    ''
  );
}

function deriveLabels(record) {
  const labels = safeArray(record?.labels || record?.fields?.labels);
  return labels.map((label) => toText(label)).filter(Boolean);
}

function normalizeRecord(record, index = 0) {
  const issueKey =
    record?.issueKey ||
    record?.key ||
    record?.id ||
    record?.fields?.key ||
    `ITEM-${index + 1}`;

  const summary =
    record?.summary ||
    record?.fields?.summary ||
    record?.title ||
    record?.name ||
    'No summary';

  const status = deriveStatus(record);
  const owner = deriveOwner(record);
  const issueType = deriveIssueType(record);
  const sourceLink = deriveSourceLink(record);
  const labels = deriveLabels(record);

  const risk = {
    label: deriveRiskLabel(record),
  };

  const confidence = {
    label: deriveConfidenceLabel(record),
    score: toNumber(
      record?.confidence?.score ||
        record?.fields?.confidenceScore ||
        record?.fields?.confidence ||
        0,
      0
    ),
  };

  const signals = {
    dependencyLanguage: Boolean(
      record?.signals?.dependencyLanguage ||
        /depend/i.test(`${summary} ${record?.description || ''} ${labels.join(' ')}`)
    ),
    blockers: Boolean(
      record?.signals?.blockers ||
        /block/i.test(`${summary} ${record?.description || ''} ${status}`)
    ),
    openRequirements: Boolean(
      record?.signals?.openRequirements ||
        /requirement|spec|scope/i.test(`${summary} ${record?.description || ''}`)
    ),
    statusInflation: Boolean(
      record?.signals?.statusInflation ||
        /done|complete|ready/i.test(status) && /risk|block/i.test(`${summary} ${record?.description || ''}`)
    ),
  };

  return {
    issueKey,
    summary,
    status,
    issueType,
    owner,
    sourceLink,
    labels,
    risk,
    confidence,
    signals,
    description: record?.description || record?.fields?.description || '',
    raw: record,
  };
}

function buildWorkstreams(records) {
  const buckets = new Map();

  records.forEach((record) => {
    const name = record.issueType || 'Other';
    const current = buckets.get(name) || { name, count: 0 };
    current.count += 1;
    buckets.set(name, current);
  });

  return Array.from(buckets.values())
    .map((item) => ({
      ...item,
      percent: 100, // relative progress bar is driven by the card itself; 100 keeps a clean visual baseline
    }))
    .sort((a, b) => b.count - a.count);
}

function buildActions(records) {
  const actions = [];

  const blocked = records.filter((r) => r.signals.blockers || r.risk.label === 'high');
  if (blocked.length) {
    actions.push({
      title: 'Resolve blocking work',
      detail: `${blocked.length} item${blocked.length === 1 ? '' : 's'} appear blocked or high risk.`,
      state: 'Blocked',
      tag: 'Blocked',
    });
  }

  const requirements = records.filter((r) => r.signals.openRequirements);
  if (requirements.length) {
    actions.push({
      title: 'Clarify open requirements',
      detail: `${requirements.length} item${requirements.length === 1 ? '' : 's'} still have requirement or scope ambiguity.`,
      state: 'Needs requirements',
      tag: 'Needs requirements',
    });
  }

  const dependencies = records.filter((r) => r.signals.dependencyLanguage);
  if (dependencies.length) {
    actions.push({
      title: 'Chase dependency owners',
      detail: `${dependencies.length} item${dependencies.length === 1 ? '' : 's'} mention dependency risk or sequencing.`,
      state: 'Monitoring',
      tag: 'Monitoring',
    });
  }

  return actions;
}

function buildBaselineSnapshot(records, releaseName, jql) {
  const keyItems = records.slice(0, 5);

  return {
    releaseTrain: releaseName || 'TBD',
    targetVersion: releaseName || 'TBD',
    targetDate: 'TBD',
    baselineDate: 'TBD',
    baselineOwner: 'PMO',
    sourceLinks: keyItems
      .map((r) => ({
        label: r.issueKey,
        href: r.sourceLink,
      }))
      .filter((link) => link.href),
    narrative:
      records.length > 0
        ? `Baseline view for ${releaseName || 'the selected release'} is based on ${records.length} normalized record${records.length === 1 ? '' : 's'}.`
        : 'Baseline view is waiting for source records.',
    drivers: uniqueByKey(
      records
        .filter((r) => r.signals.blockers || r.risk.label !== 'low')
        .map((r) => `${r.issueKey} — ${r.summary}`)
        .slice(0, 5)
        .map((text) => ({ key: text, text }))
    ).map((item) => item.text),
    attentionItems: uniqueByKey(
      records
        .filter((r) => r.signals.blockers || r.signals.dependencyLanguage || r.signals.openRequirements)
        .map((r) => `${r.issueKey} — ${r.summary}`)
        .slice(0, 5)
        .map((text) => ({ key: text, text }))
    ).map((item) => item.text),
    jql,
  };
}

function buildCommittedScope(records) {
  const committed = records.filter((r) => r.status && !/out of scope|won't do|cancelled/i.test(r.status));
  const outOfScope = records.filter((r) =>
    /out of scope|won't do|cancelled|de-scoped/i.test(`${r.summary} ${r.status} ${r.description}`)
  );
  const lateEntryWork = records.filter((r) =>
    /late|new|emergency|hotfix/i.test(`${r.summary} ${r.description} ${r.labels.join(' ')}`)
  );

  return {
    whatIsCommitted:
      committed.length > 0
        ? `${committed.length} item${committed.length === 1 ? '' : 's'} currently appear committed.`
        : 'No committed scope yet',
    included: committed.slice(0, 8).map((r) => ({
      key: r.issueKey,
      summary: r.summary,
    })),
    outOfScope: outOfScope.slice(0, 8).map((r) => ({
      key: r.issueKey,
      summary: r.summary,
    })),
    lateEntryWork: lateEntryWork.slice(0, 8).map((r) => ({
      key: r.issueKey,
      summary: r.summary,
    })),
  };
}

function buildRomCapacity(records) {
  const blockers = records.filter((r) => r.signals.blockers || r.risk.label === 'high').length;
  const dependencyCount = records.filter((r) => r.signals.dependencyLanguage).length;
  const total = records.length || 1;
  const confidence = Math.max(
    0,
    Math.min(
      100,
      90 - blockers * 12 - dependencyCount * 4
    )
  );

  return {
    devRom: 'TBD',
    qaRom: 'TBD',
    devCapacity: `${Math.max(0, 100 - blockers * 15)}%`,
    qaCapacity: `${Math.max(0, 100 - dependencyCount * 10)}%`,
    remainingBuffer: `${Math.max(0, 100 - total * 4)}%`,
    romConfidence: confidence,
    requirementMaturity: blockers > 0 ? 'Needs attention' : 'Stable',
  };
}

function buildSinceBaseline(records) {
  return {
    scopeAdded: records
      .filter((r) => /new|added|additional/i.test(`${r.summary} ${r.description}`))
      .slice(0, 6)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    scopeRemoved: records
      .filter((r) => /removed|dropped|out of scope|de-scoped/i.test(`${r.summary} ${r.description}`))
      .slice(0, 6)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    romChanges: records
      .filter((r) => /rom|estimate|estimate changed|re-estimate/i.test(`${r.summary} ${r.description}`))
      .slice(0, 6)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    dependencyChanges: records
      .filter((r) => r.signals.dependencyLanguage)
      .slice(0, 6)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    capacityPressure: records
      .filter((r) => r.signals.blockers || r.risk.label === 'high')
      .slice(0, 6)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    lateEntryWork: records
      .filter((r) => /late|emergency|hotfix/i.test(`${r.summary} ${r.description}`))
      .slice(0, 6)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
  };
}

function buildRisksDependenciesGaps(records) {
  return {
    knownRisks: records
      .filter((r) => r.risk.label !== 'low')
      .slice(0, 8)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    knownDependencies: records
      .filter((r) => r.signals.dependencyLanguage)
      .slice(0, 8)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    knownAssumptions: records
      .filter((r) => /assume|assumption/i.test(`${r.summary} ${r.description}`))
      .slice(0, 8)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    knownRequirementGaps: records
      .filter((r) => r.signals.openRequirements)
      .slice(0, 8)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
    decisionNeeded: records
      .filter((r) => r.signals.blockers || r.risk.label === 'high')
      .slice(0, 8)
      .map((r) => ({ key: r.issueKey, text: r.summary })),
  };
}

function buildReleaseSnapshot(records, releaseName, total, visible) {
  const highRisk = records.filter((r) => r.risk.label === 'high').length;
  const mediumRisk = records.filter((r) => r.risk.label === 'medium').length;
  const blockers = records.filter((r) => r.signals.blockers).length;

  const confidenceScore = Math.max(
    0,
    Math.min(100, 92 - highRisk * 18 - mediumRisk * 8 - blockers * 10)
  );

  return {
    narrative:
      records.length > 0
        ? `${releaseName || 'This release'} currently has ${highRisk} high-risk item${highRisk === 1 ? '' : 's'} and ${blockers} blocker${blockers === 1 ? '' : 's'}.`
        : 'No records were returned for this release yet.',
    drivers: records
      .filter((r) => r.risk.label !== 'low' || r.signals.blockers || r.signals.dependencyLanguage)
      .slice(0, 5)
      .map((r) => `${r.issueKey} — ${r.summary}`),
    attentionItems: records
      .filter((r) => r.signals.blockers || r.signals.openRequirements)
      .slice(0, 5)
      .map((r) => `${r.issueKey} — ${r.summary}`),
    total,
    visible,
    releaseHealth:
      blockers > 0 || highRisk > 0 ? 'At Risk' : mediumRisk > 0 ? 'Watch' : 'On Track',
    confidenceScore,
  };
}

function buildMetrics(records) {
  const highRisk = records.filter((r) => r.risk.label === 'high').length;
  const mediumRisk = records.filter((r) => r.risk.label === 'medium').length;
  const blockers = records.filter((r) => r.signals.blockers).length;
  const decisionsNeeded = records.filter((r) => r.signals.openRequirements || r.signals.blockers).length;

  return {
    highRisk,
    mediumRisk,
    blockers,
    decisionsNeeded,
  };
}

function buildCardStates(metrics) {
  const baselineSnapshot =
    metrics.highRisk > 0 ? 'red' : metrics.mediumRisk > 0 ? 'yellow' : 'green';
  const committedScope = metrics.blockers > 0 ? 'red' : 'yellow';
  const romCapacity = metrics.blockers > 0 ? 'red' : 'green';
  const risksDependenciesGaps = metrics.highRisk > 0 ? 'red' : 'yellow';
  const sinceBaseline = metrics.mediumRisk > 0 ? 'yellow' : 'green';
  const executiveTakeaway = metrics.highRisk > 0 || metrics.blockers > 0 ? 'red' : 'green';

  return {
    baselineSnapshot,
    committedScope,
    romCapacity,
    risksDependenciesGaps,
    sinceBaseline,
    executiveTakeaway,
  };
}

function buildSourceLinks(records, jql) {
  const firstWithLink = records.find((r) => r.sourceLink);
  return {
    jiraFilter: jql || '',
    releaseCalendar: firstWithLink?.sourceLink || '',
    capacitySource: firstWithLink?.sourceLink || '',
    planningNotes: firstWithLink?.sourceLink || '',
    baselineConfluencePage: firstWithLink?.sourceLink || '',
  };
}

export function buildDashboardViewModel({
  records = [],
  total = records.length,
  jql = '',
  releaseName = '',
  mode = 'empty',
} = {}) {
  const normalized = records.map(normalizeRecord);
  const metrics = buildMetrics(normalized);
  const visible = normalized.length;
  const summary = buildReleaseSnapshot(normalized, releaseName, total, visible);
  const cardStates = buildCardStates(metrics);

  return createDashboardTemplate({
    metadata: {
      appName: 'AI Dashboard',
      templateName: 'Executive Release Dashboard',
      version: '1.0.0',
      mode,
    },
    filters: {
      releaseId: releaseName,
      releaseName,
      team: '',
      view: 'Executive',
    },
    summary: {
      releaseHealth: summary.releaseHealth,
      confidenceScore: summary.confidenceScore,
      total,
      visible,
      jql,
    },
    metrics,
    baselineSnapshot: buildBaselineSnapshot(normalized, releaseName, jql),
    committedScope: buildCommittedScope(normalized),
    romCapacity: buildRomCapacity(normalized),
    sinceBaseline: buildSinceBaseline(normalized),
    releaseSnapshot: summary,
    risksDependenciesGaps: buildRisksDependenciesGaps(normalized),
    workstreams: buildWorkstreams(normalized),
    actions: buildActions(normalized),
    records: normalized,
    sourceLinks: buildSourceLinks(normalized, jql),
    cardStates,
  });
}