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

const CARD_JQL_FILTERS = {
  metrics: 'priority in (Highest, High) OR labels = blocker OR status = Blocked',
  executiveTakeaway: 'priority in (Highest, High) OR labels = blocker OR status in ("Blocked", "In Progress")',
  workstreamHealth: '',
  baselineSnapshot: 'labels = baseline OR summary ~ "baseline"',
  committedScope: 'status not in ("Cancelled", "Out of Scope", "Done")',
  releaseRisks: 'priority in (Highest, High) OR labels = blocker OR status = Blocked',
  executiveActions: 'priority in (Highest, High) OR labels = blocker OR status in ("Blocked", "In Progress")',
  sourceLinks: '',
};

function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }

  if (error && typeof error.message === 'string' && error.message.trim()) {
    return new Error(error.message);
  }

  if (error && typeof error.toString === 'function') {
    const text = String(error.toString()).trim();
    if (text && text !== '[object Object]' && text !== '[object Undefined]' && text !== 'undefined') {
      return new Error(text);
    }
  }

  return new Error('Failed to load dashboard data');
}

function escapeJqlValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildJqlFilter({ releaseId, team }, settings = {}) {
  const clauses = [];
  const projectKey = String(settings.jiraProjectKey || process.env.JIRA_PROJECT_KEY || '').trim();
  const release = String(releaseId || '').trim();
  const teamValue = String(team || '').trim();
  const configuredTeamField = String(settings.jiraTeamField || '').trim();

  if (projectKey) {
    clauses.push(`project = "${escapeJqlValue(projectKey)}"`);
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

  return clauses.length > 0 ? clauses.join(' AND ') : 'updated >= -30d';
}

function buildJql({ releaseId, team, view }, settings = {}) {
  const clauses = [];
  const projectKey = String(settings.jiraProjectKey || process.env.JIRA_PROJECT_KEY || '').trim();
  const release = String(releaseId || '').trim();
  const teamValue = String(team || '').trim();
  const configuredTeamField = String(settings.jiraTeamField || '').trim();

  if (projectKey) {
    clauses.push(`project = "${escapeJqlValue(projectKey)}"`);
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

  const viewClause =
    view === 'Release' ? 'ORDER BY priority DESC, updated DESC' : 'ORDER BY updated DESC';

  return `${buildJqlFilter({ releaseId, team }, settings)} ${viewClause}`;
}

function normalizeJiraIssue(issue = {}) {
  const fields = issue?.fields || {};
  const summary = String(fields.summary || 'No summary').trim();
  const issueKey = String(issue?.key || fields.key || summary || '').trim();
  const issueType = String(fields.issuetype?.name || 'Issue').trim();
  const status = String(fields.status?.name || 'Unknown').trim();
  const owner = String(fields.assignee?.displayName || fields.reporter?.displayName || 'Unassigned').trim();
  const priority = String(fields.priority?.name || '').toLowerCase();
  const labels = Array.isArray(fields.labels) ? fields.labels.map((l) => String(l).trim()).filter(Boolean) : [];

  let risk = 'low';
  if (
    priority.includes('highest') ||
    priority.includes('critical') ||
    priority.includes('blocker') ||
    labels.includes('blocker') ||
    /critical|blocker/i.test(`${summary} ${status}`)
  ) {
    risk = 'high';
  } else if (priority.includes('high') || labels.includes('high')) {
    risk = 'medium';
  }

  const confidence = /done|closed|resolved/i.test(status) ? 'high' : risk === 'low' ? 'medium' : 'low';

  return {
    issueKey,
    issueType,
    summary,
    status,
    owner,
    labels,
    risk: { label: risk },
    confidence: { label: confidence },
    sourceLink: String(fields.self || issue?.self || '').trim(),
    raw: issue,
  };
}

function buildCardJql(baseFilter, cardClause, view) {
  const combined = baseFilter && cardClause ? `${baseFilter} AND (${cardClause})` : baseFilter || cardClause || 'updated >= -30d';
  const viewClause =
    view === 'Release' ? 'ORDER BY priority DESC, updated DESC' : 'ORDER BY updated DESC';

  return `${combined} ${viewClause}`;
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
      const name = String(version?.name || version?.id || '').trim();
      if (!name) {
        continue;
      }

      if (!seen.has(name)) {
        seen.set(name, {
          id: name,
          name,
        });
      }
    }
  }

  return [
    DEFAULT_RELEASE_OPTIONS[0],
    ...Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

async function fetchJiraReleaseOptions(settings = {}, issues = []) {
  const projectKey = String(settings.jiraProjectKey || process.env.JIRA_PROJECT_KEY || '').trim();

  if (!projectKey) {
    return buildReleaseOptions(issues);
  }

  const versions = await requestJson(
    route`/rest/api/3/project/${projectKey}/versions`,
    {},
    'jira'
  );

  if (!Array.isArray(versions)) {
    return buildReleaseOptions(issues);
  }

  const seen = new Map();
  for (const version of versions) {
    const name = String(version?.name || version?.id || '').trim();
    if (!name) {
      continue;
    }

    if (!seen.has(name)) {
      seen.set(name, {
        id: name,
        name,
      });
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

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactConfluencePage(page) {
  const spaceKey = String(page?.space?.key || '').trim();
  const bodyText = stripHtml(page?.body?.storage?.value || page?.excerpt || '');

  return {
    id: String(page?.id || ''),
    title: page?.title || '',
    spaceKey,
    bodyText: bodyText.slice(0, 1200),
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

async function summarizeWithOpenAI({
  summary,
  metrics,
  workstreams,
  actions,
  records,
  confluencePages,
  sourceLinks,
}) {
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
                confluencePages: Array.isArray(confluencePages)
                  ? confluencePages.map(compactConfluencePage)
                  : [],
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

async function fetchConfluenceSpaces() {
  const payload = await requestJson(route`/wiki/api/v2/spaces?limit=${100}`, {}, 'confluence');
  const seen = new Map();

  for (const space of Array.isArray(payload.results) ? payload.results : []) {
    const key = String(space?.key || '').trim();
    const name = String(space?.name || key || 'Space').trim();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.set(key, {
      id: key,
      name: `${name} (${key})`,
    });
  }

  return [
    { id: '', name: 'Select a Confluence Space' },
    ...Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

async function fetchConfluenceSnapshot(confluenceSpaceKey = '') {
  const spaceKey = String(confluenceSpaceKey || '').trim();

  if (!spaceKey) {
    return {
      pages: [],
      source: null,
    };
  }

  const cql = `space="${spaceKey}" AND type=page`;

  const search = await requestJson(
    route`/wiki/rest/api/search?cql=${cql}&limit=10&expand=version,space`,
    {},
    'confluence'
  );

  const results = Array.isArray(search.results) ? search.results : [];
  const pageIds = results
    .map((result) => String(result?.content?.id || result?.id || '').trim())
    .filter(Boolean)
    .slice(0, 10);

  const pages = await Promise.all(
    pageIds.map(async (pageId) => {
      try {
        return await requestJson(
          route`/wiki/rest/api/content/${pageId}?expand=version,space,body.storage`,
          {},
          'confluence'
        );
      } catch (error) {
        console.warn(`Failed to fetch Confluence page ${pageId}:`, error);
        return null;
      }
    })
  );

  return {
    pages: pages.filter(Boolean),
    source: {
      spaceKey,
      cql,
      endpoint: '/wiki/rest/api/search',
    },
  };
}

function buildSourceLinks({ jql, confluenceSnapshot, confluenceSpaceKey, refreshedAt }) {
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
      endpoint: confluenceSnapshot?.source?.endpoint || '/wiki/rest/api/search',
      spaceKey: confluenceSpaceKey || confluenceSnapshot?.source?.spaceKey || null,
      cql:
        confluenceSnapshot?.source?.cql ||
        (confluenceSpaceKey ? `space="${confluenceSpaceKey}" AND type=page` : null),
      transformationSummary: confluenceSnapshot?.pages?.length
        ? 'Fetched pages from the selected Confluence space.'
        : 'No pages were found in the selected Confluence space.',
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
  try {
    const settings = await readSettings();
    const refreshedAt = new Date().toISOString();
    const releaseId = String(payload?.releaseId || '').trim();
    const confluenceSpaceKey = String(payload?.confluenceSpaceKey || '').trim();
    const team = String(payload?.team || '').trim();
    const baseFilter = buildJqlFilter({ releaseId, team }, settings);
    const jql = buildJql({ releaseId, team, view: payload?.view }, settings);
    const issues = await fetchJiraIssues(jql);
    const [confluenceSpaceOptions, releaseOptions] = await Promise.all([
      fetchConfluenceSpaces(),
      fetchJiraReleaseOptions(settings, issues),
    ]);
    const confluenceSnapshot = await fetchConfluenceSnapshot(confluenceSpaceKey);

    const cardJqlClauses = {
      ...CARD_JQL_FILTERS,
      ...(settings.cardJqlClauses || {}),
    };

    const normalizedRecords = issues.map(normalizeJiraIssue);

    const cardData = {};
    for (const [cardKey, extraClause] of Object.entries(cardJqlClauses)) {
      if (!extraClause) {
        cardData[cardKey] = { records: normalizedRecords, jql };
        continue;
      }

      const cardJql = buildCardJql(baseFilter, extraClause, payload?.view);
      const cardIssues = await fetchJiraIssues(cardJql);
      cardData[cardKey] = {
        records: cardIssues.map(normalizeJiraIssue),
        jql: cardJql,
      };
    }

    const teamOptions = buildTeamOptions(issues, settings);
    const metrics = buildMetrics(issues);
    const workstreams = buildWorkstreams(issues);
    const actions = buildActions(issues);
    const sourceLinks = buildSourceLinks({
      jql,
      confluenceSnapshot,
      confluenceSpaceKey,
      refreshedAt,
    });
    const aiSummary = await summarizeWithOpenAI({
      summary: {
        total: issues.length,
        visible: issues.length,
        jql,
        refreshedAt,
        sourceSystem: 'Jira',
        confluenceSpaceKey: confluenceSpaceKey || null,
      },
      metrics,
      workstreams,
      actions,
      records: normalizedRecords.slice(0, 25),
      confluencePages: confluenceSnapshot.pages.slice(0, 10),
      sourceLinks,
    });

    return {
      releaseOptions,
      confluenceSpaceOptions,
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
        records: normalizedRecords,
        cardData,
        cardStates: {
          jira: issues.length > 0 ? 'loaded' : 'empty',
          confluence: confluenceSnapshot.pages.length > 0 ? 'loaded' : 'empty',
          openai: aiSummary ? 'loaded' : 'empty',
        },
      },
    };
  } catch (error) {
    throw normalizeError(error);
  }
});

module.exports.handler = resolver.getDefinitions();