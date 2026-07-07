const forgeResolverModule = require('@forge/resolver');
const Resolver = forgeResolverModule.default || forgeResolverModule;

const forgeApiModule = require('@forge/api');
const api = forgeApiModule.default || forgeApiModule.api || forgeApiModule;
const storage = forgeApiModule.storage || api.storage;
const route = forgeApiModule.route || forgeApiModule.default?.route;

const resolver = new Resolver();
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 20000);

const DEFAULT_RELEASE_OPTIONS = [{ id: '', name: 'Select a release' }];
const DEFAULT_TEAM_OPTIONS = [{ id: '', name: 'Select a team' }];
const DEFAULT_VIEW_OPTIONS = ['Executive', 'Team', 'Release'];
const DEFAULT_FIELDS = [
  'summary',
  'issuetype',
  'status',
  'assignee',
  'reporter',
  'priority',
  'labels',
  'fixVersions',
  'components',
  'updated',
  'created',
];
const SETTINGS_KEY = 'dashboard-settings';

function escapeJqlValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildJql({ releaseId, team, view }, settings = {}) {
  const clauses = [];
  const projectKey = String(settings.jiraProjectKey || '').trim();
  const release = String(releaseId || '').trim();
  const teamValue = String(team || '').trim();
  const configuredTeamField = String(settings.jiraTeamField || '').trim();

  if (projectKey) {
    clauses.push(`project = "${escapeJqlValue(projectKey)}"`);
  } else {
    clauses.push('project is not EMPTY');
  }

  if (release) {
    clauses.push(`fixVersion = "${escapeJqlValue(release)}"`);
  }

  if (teamValue && configuredTeamField) {
    clauses.push(`"${escapeJqlValue(configuredTeamField)}" = "${escapeJqlValue(teamValue)}"`);
  }

  if (Array.isArray(settings.extraJqlClauses) && settings.extraJqlClauses.length > 0) {
    for (const clause of settings.extraJqlClauses) {
      if (typeof clause === 'string' && clause.trim()) {
        clauses.push(clause.trim());
      }
    }
  }

  const base = clauses.length > 0 ? clauses.join(' AND ') : 'project is not EMPTY';
  const viewClause =
    view === 'Release' ? 'ORDER BY priority DESC, updated DESC' : 'ORDER BY updated DESC';

  return `${base} ${viewClause}`;
}

async function readSettings() {
  const settings = await storage.get(SETTINGS_KEY);
  return settings && typeof settings === 'object' ? settings : {};
}

async function requestJson(path, requestOptions = {}, product = 'jira') {
  const client =
    product === 'confluence' ? api.asUser().requestConfluence : api.asUser().requestJira;
  const response = await client(path, requestOptions);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `${product} request failed: ${response.status} ${response.statusText} ${body}`
    );
  }

  return response.json();
}

async function fetchJiraIssues(jql) {
  const issues = [];
  let startAt = 0;
  const maxResults = 50;
  let total = 0;

  do {
    const payload = await requestJson(
      route`/rest/api/3/search/jql?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=${DEFAULT_FIELDS.join(',')}`,
      {},
      'jira'
    );
    const batch = Array.isArray(payload.issues) ? payload.issues : [];

    issues.push(...batch);
    total = Number(payload.total || issues.length);
    startAt += batch.length;
  } while (startAt < total && issues.length < 200);

  return issues;
}

function buildReleaseOptions(issues) {
  const seen = new Map();

  for (const issue of issues) {
    const versions = Array.isArray(issue?.fields?.fixVersions) ? issue.fields.fixVersions : [];
    for (const version of versions) {
      const id = String(version?.id || version?.name || '').trim();
      const name = String(version?.name || version?.id || '').trim();
      if (!id && !name) {
        continue;
      }

      const key = id || name;
      if (!seen.has(key)) {
        seen.set(key, {
          id: key,
          name: name || key,
        });
      }
    }
  }

  return [
    DEFAULT_RELEASE_OPTIONS[0],
    ...Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

function buildTeamOptions(issues, settings = {}) {
  const teamField = String(settings.jiraTeamField || '').trim();
  const seen = new Map();

  for (const issue of issues) {
    const fields = issue?.fields || {};
    let value = '';

    if (teamField && fields[teamField] != null) {
      value = Array.isArray(fields[teamField])
        ? String(fields[teamField][0] || '')
        : String(fields[teamField] || '');
    } else if (Array.isArray(fields.components) && fields.components.length > 0) {
      value = String(fields.components[0]?.name || '');
    }

    if (!value) {
      continue;
    }

    if (!seen.has(value)) {
      seen.set(value, { id: value, name: value });
    }
  }

  return [
    DEFAULT_TEAM_OPTIONS[0],
    ...Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

function buildMetrics(issues) {
  const highRisk = issues.filter((issue) => {
    const fields = issue?.fields || {};
    const priority = String(fields.priority?.name || '').toLowerCase();
    const labels = Array.isArray(fields.labels)
      ? fields.labels.map((label) => String(label).toLowerCase())
      : [];
    const summary = String(fields.summary || '');
    const status = String(fields.status?.name || '');

    return (
      priority.includes('highest') ||
      priority.includes('critical') ||
      priority.includes('blocker') ||
      labels.includes('blocker') ||
      /critical|blocker/i.test(`${summary} ${status}`)
    );
  }).length;

  const mediumRisk = issues.filter((issue) => {
    const fields = issue?.fields || {};
    const priority = String(fields.priority?.name || '').toLowerCase();
    const labels = Array.isArray(fields.labels)
      ? fields.labels.map((label) => String(label).toLowerCase())
      : [];

    return (
      priority.includes('high') ||
      priority.includes('medium') ||
      labels.includes('high') ||
      labels.includes('medium')
    );
  }).length;

  const blockers = issues.filter((issue) => {
    const fields = issue?.fields || {};
    const summary = String(fields.summary || '');
    const status = String(fields.status?.name || '');

    return /blocked|blocker/i.test(`${status} ${summary}`);
  }).length;

  const decisionsNeeded = issues.filter((issue) => {
    const fields = issue?.fields || {};
    const summary = String(fields.summary || '');
    const status = String(fields.status?.name || '');

    return /decision|approve|clarify|confirm/i.test(`${status} ${summary}`);
  }).length;

  return { highRisk, mediumRisk, blockers, decisionsNeeded };
}

function buildWorkstreams(issues) {
  const groups = new Map();

  for (const issue of issues) {
    const fields = issue?.fields || {};
    const name = String(
      fields.components?.[0]?.name || fields.assignee?.displayName || 'Unassigned'
    );
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(issue);
  }

  return Array.from(groups.entries()).map(([name, groupedIssues]) => ({
    name,
    total: groupedIssues.length,
    blocked: groupedIssues.filter((issue) =>
      /blocked|blocker/i.test(String(issue?.fields?.status?.name || ''))
    ).length,
    highRisk: groupedIssues.filter((issue) => {
      const fields = issue?.fields || {};
      const priority = String(fields.priority?.name || '').toLowerCase();
      const labels = Array.isArray(fields.labels)
        ? fields.labels.map((label) => String(label).toLowerCase())
        : [];

      return (
        priority.includes('highest') ||
        priority.includes('critical') ||
        priority.includes('blocker') ||
        labels.includes('blocker')
      );
    }).length,
  }));
}

function buildActions(issues) {
  return issues
    .filter((issue) =>
      /decision|approve|clarify|confirm/i.test(
        `${issue?.fields?.status?.name || ''} ${issue?.fields?.summary || ''}`
      )
    )
    .slice(0, 10)
    .map((issue) => ({
      issueKey: issue?.key || '',
      summary: issue?.fields?.summary || '',
      owner:
        issue?.fields?.assignee?.displayName ||
        issue?.fields?.reporter?.displayName ||
        'Unassigned',
      status: issue?.fields?.status?.name || 'Unknown',
    }));
}

function compactIssueRecord(record) {
  return {
    issueKey: record?.issueKey || '',
    issueType: record?.issueType || '',
    summary: record?.summary || '',
    status: record?.status || '',
    owner: record?.owner || '',
    risk: record?.risk?.label || 'unknown',
    confidence: record?.confidence?.label || 'unknown',
  };
}

function extractOpenAiText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];

  for (const item of data?.output || []) {
    if (item?.type !== 'message') {
      continue;
    }

    for (const content of item?.content || []) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        parts.push(content.text.trim());
      } else if (typeof content?.value === 'string' && content.value.trim()) {
        parts.push(content.value.trim());
      }
    }
  }

  return parts.join('\n').trim();
}

async function summarizeWithOpenAI({ summary, metrics, workstreams, actions, records, sourceLinks }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        store: false,
        reasoning: {
          effort: 'low',
        },
        input: [
          {
            role: 'system',
            content:
              'You are an executive PMO analyst. Use only the supplied Jira and Confluence data. Do not invent facts, dates, owners, risks, or metrics. If information is missing, say so plainly. Return a concise executive readout with these sections: Executive summary, Top risks, Recommended actions, and Confidence.',
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                summary,
                metrics,
                workstreams,
                actions,
                records: Array.isArray(records) ? records.map(compactIssueRecord) : [],
                sourceLinks,
              },
              null,
              2
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();

      if (response.status === 429 && body.includes('insufficient_quota')) {
        console.warn('OpenAI quota exhausted; skipping AI summary.');
        return null;
      }

      throw new Error(`OpenAI request failed: ${response.status} ${response.statusText} ${body}`);
    }

    const data = await response.json();
    const text = extractOpenAiText(data);
    return text || null;
  } catch (error) {
    const message = String(error?.message || '');

    if (message.includes('insufficient_quota') || message.includes('429')) {
      console.warn('OpenAI quota exhausted; skipping AI summary.');
      return null;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchConfluenceSnapshot(settings = {}) {
  const pageId = String(settings.confluencePageId || '').trim();
  const cql = String(settings.confluenceCql || '').trim();

  if (!pageId && !cql) {
    return {
      pages: [],
      source: null,
    };
  }

  if (pageId) {
    const page = await requestJson(
      route`/wiki/rest/api/content/${pageId}?expand=version,space,body.storage`,
      {},
      'confluence'
    );
    return {
      pages: [page],
      source: {
        pageId,
        endpoint: `/wiki/rest/api/content/${pageId}`,
      },
    };
  }

  const search = await requestJson(
    route`/wiki/rest/api/search?cql=${cql}&limit=10&expand=version,space`,
    {},
    'confluence'
  );
  return {
    pages: Array.isArray(search.results) ? search.results : [],
    source: {
      cql,
      endpoint: '/wiki/rest/api/search',
    },
  };
}

function buildSourceLinks({ jql, confluenceSnapshot, settings, refreshedAt }) {
  return {
    jira: {
      system: 'Jira',
      endpoint: '/rest/api/3/search/jql',
      jql,
      transformationSummary: 'Fetched live issues and derived dashboard metrics from Jira fields.',
      lastRefresh: refreshedAt,
    },
    confluence: {
      system: 'Confluence',
      endpoint: confluenceSnapshot?.source?.endpoint || null,
      cql: settings.confluenceCql || null,
      pageId: settings.confluencePageId || null,
      transformationSummary: confluenceSnapshot?.pages?.length
        ? 'Fetched configured executive source pages from Confluence.'
        : 'No Confluence source was configured, so no Confluence records were included.',
      lastRefresh: refreshedAt,
    },
    openai: {
      system: 'OpenAI',
      endpoint: '/v1/responses',
      model: OPENAI_MODEL,
      transformationSummary:
        'Analyzed only the live Jira and Confluence payload supplied by the backend resolver.',
      lastRefresh: refreshedAt,
    },
  };
}

resolver.define('getDashboardData', async ({ payload }) => {
  const settings = await readSettings();
  const refreshedAt = new Date().toISOString();
  const jql = buildJql(payload || {}, settings);
  const issues = await fetchJiraIssues(jql);
  const confluenceSnapshot = await fetchConfluenceSnapshot(settings);

  const releaseOptions = buildReleaseOptions(issues);
  const teamOptions = buildTeamOptions(issues, settings);
  const metrics = buildMetrics(issues);
  const workstreams = buildWorkstreams(issues);
  const actions = buildActions(issues);
  const sourceLinks = buildSourceLinks({ jql, confluenceSnapshot, settings, refreshedAt });
  const normalizedRecords = issues.map((issue) => ({
    issueKey: issue?.key || '',
    issueType: issue?.fields?.issuetype?.name || 'Issue',
    summary: issue?.fields?.summary || 'No summary',
    status: issue?.fields?.status?.name || 'Unknown',
    owner:
      issue?.fields?.assignee?.displayName ||
      issue?.fields?.reporter?.displayName ||
      'Unassigned',
    risk: { label: 'unknown' },
    confidence: { label: 'unknown' },
  }));
  const aiSummary = await summarizeWithOpenAI({
    summary: {
      total: issues.length,
      visible: issues.length,
      jql,
      refreshedAt,
      sourceSystem: 'Jira',
    },
    metrics,
    workstreams,
    actions,
    records: normalizedRecords.slice(0, 25),
    sourceLinks,
  });

  return {
    releaseOptions,
    teamOptions,
    viewOptions: DEFAULT_VIEW_OPTIONS,
    issues,
    dashboard: {
      summary: {
        total: issues.length,
        visible: issues.length,
        jql,
        refreshedAt,
        sourceSystem: 'Jira',
      },
      metrics,
      workstreams,
      actions,
      aiSummary,
      baselineSnapshot: {
        sourceSystem: 'Confluence',
        pages: confluenceSnapshot.pages.length,
      },
      committedScope: {
        sourceSystem: 'Jira',
        issues: issues.length,
      },
      sourceLinks,
      cardStates: {
        jira: issues.length > 0 ? 'loaded' : 'empty',
        confluence: confluenceSnapshot.pages.length > 0 ? 'loaded' : 'empty',
        openai: aiSummary ? 'loaded' : 'empty',
      },
    },
  };
});

module.exports.handler = resolver.getDefinitions();