const forgeResolverModule = require('@forge/resolver');
const Resolver = forgeResolverModule.default || forgeResolverModule;

const forgeApiModule = require('@forge/api');
const api = forgeApiModule.default || forgeApiModule.api || forgeApiModule;
const storage = forgeApiModule.storage || api.storage;
const route = forgeApiModule.route || api.route || forgeApiModule.default?.route;

const resolver = new Resolver();

const DEFAULT_RELEASE_ID = process.env.DEFAULT_RELEASE_ID || 'VMSv26.06.00';
const DEFAULT_TEAM = process.env.DEFAULT_TEAM || 'VMS';
const DEFAULT_JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'VMS';
const DEFAULT_CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'PS';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 20000);
const SETTINGS_KEY = 'dashboard-settings';

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
  'created'
];

const DEFAULT_RELEASE_OPTIONS = [{ id: DEFAULT_RELEASE_ID, name: DEFAULT_RELEASE_ID }];
const DEFAULT_TEAM_OPTIONS = [{ id: DEFAULT_TEAM, name: DEFAULT_TEAM }];
const DEFAULT_VIEW_OPTIONS = ['Executive', 'Team', 'Release'];

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
  return new Error('Failed to load dashboard data');
}

function escapeJqlValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildJql({ releaseId, team, view }, settings = {}) {
  const clauses = buildJqlFilterParts({ releaseId, team }, settings);
  const sortClause = view === 'Release' ? 'ORDER BY priority DESC, updated DESC' : 'ORDER BY updated DESC';
  return `${clauses.join(' AND ') || 'updated >= -30d'} ${sortClause}`;
}

function buildJqlFilterParts({ releaseId, team }, settings = {}) {
  const clauses = [];
  const projectKey = normalizeText(settings.jiraProjectKey || DEFAULT_JIRA_PROJECT_KEY);
  const release = normalizeText(releaseId || DEFAULT_RELEASE_ID);
  const teamValue = normalizeText(team || DEFAULT_TEAM);
  const teamField = normalizeText(settings.jiraTeamField || '');

  if (projectKey) {
    clauses.push(`project = "${escapeJqlValue(projectKey)}"`);
  }

  if (release) {
    clauses.push(`fixVersion = "${escapeJqlValue(release)}"`);
  }

  if (teamValue && teamField) {
    clauses.push(`"${escapeJqlValue(teamField)}" = "${escapeJqlValue(teamValue)}"`);
  }

  if (Array.isArray(settings.extraJqlClauses)) {
    for (const clause of settings.extraJqlClauses) {
      if (typeof clause === 'string' && clause.trim()) {
        clauses.push(clause.trim());
      }
    }
  }

  return clauses;
}

function buildCardJql(baseJql, cardClause, view) {
  const combined = cardClause ? `${baseJql} AND (${cardClause})` : baseJql;
  const sortClause = view === 'Release' ? 'ORDER BY priority DESC, updated DESC' : 'ORDER BY updated DESC';
  return `${combined} ${sortClause}`;
}

function normalizeJiraIssue(issue = {}) {
  const fields = issue.fields || {};
  const summary = normalizeText(fields.summary || 'No summary');
  const issueType = normalizeText(fields.issuetype?.name || 'Issue');
  const status = normalizeText(fields.status?.name || 'Unknown');
  const owner = normalizeText(fields.assignee?.displayName || fields.reporter?.displayName || 'Unassigned');
  const priority = String(fields.priority?.name || '').toLowerCase();
  const labels = Array.isArray(fields.labels) ? fields.labels.map((label) => String(label).toLowerCase()) : [];

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
    issueKey: normalizeText(issue.key || fields.key || summary),
    issueType,
    summary,
    status,
    owner,
    labels,
    risk: { label: risk },
    confidence: { label: confidence },
    sourceLink: normalizeText(fields.self || issue.self || ''),
  };
}

async function readSettings() {
  if (!storage || typeof storage.get !== 'function') {
    return {};
  }

  const settings = await storage.get(SETTINGS_KEY);
  return settings && typeof settings === 'object' ? settings : {};
}

async function requestJson(path, requestOptions = {}, product = 'jira') {
  const appClient = product === 'confluence' ? api.asApp().requestConfluence : api.asApp().requestJira;
  const userClient = product === 'confluence' ? api.asUser().requestConfluence : api.asUser().requestJira;

  async function parseResponse(client) {
    const response = await client(path, requestOptions);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${product} request failed: ${response.status} ${response.statusText} ${body}`);
    }
    return response.json();
  }

  try {
    return await parseResponse(appClient);
  } catch (appError) {
    try {
      return await parseResponse(userClient);
    } catch (userError) {
      throw normalizeError(userError || appError);
    }
  }
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
  const seen = new Map([[DEFAULT_RELEASE_ID, { id: DEFAULT_RELEASE_ID, name: DEFAULT_RELEASE_ID }]]);

  for (const issue of issues) {
    for (const version of issue?.fields?.fixVersions || []) {
      const name = normalizeText(version?.name || version?.id || '');
      if (name && !seen.has(name)) {
        seen.set(name, { id: name, name });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildTeamOptions(issues) {
  const seen = new Map([[DEFAULT_TEAM, { id: DEFAULT_TEAM, name: DEFAULT_TEAM }]]);

  for (const issue of issues) {
    const components = Array.isArray(issue?.fields?.components) ? issue.fields.components : [];
    for (const component of components) {
      const name = normalizeText(component?.name || '');
      if (name && !seen.has(name)) {
        seen.set(name, { id: name, name });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildMetrics(issues) {
  const highRisk = issues.filter((issue) => {
    const fields = issue?.fields || {};
    const priority = String(fields.priority?.name || '').toLowerCase();
    const labels = Array.isArray(fields.labels) ? fields.labels.map((label) => String(label).toLowerCase()) : [];
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
    const labels = Array.isArray(fields.labels) ? fields.labels.map((label) => String(label).toLowerCase()) : [];
    return priority.includes('high') || priority.includes('medium') || labels.includes('high') || labels.includes('medium');
  }).length;

  const blockers = issues.filter((issue) => /blocked|blocker/i.test(String(issue?.fields?.status?.name || ''))).length;
  const decisionsNeeded = issues.filter((issue) =>
    /decision|approve|clarify|confirm/i.test(`${issue?.fields?.status?.name || ''} ${issue?.fields?.summary || ''}`)
  ).length;

  return { highRisk, mediumRisk, blockers, decisionsNeeded };
}

function buildWorkstreams(issues) {
  const groups = new Map();

  for (const issue of issues) {
    const fields = issue?.fields || {};
    const key = normalizeText(fields.components?.[0]?.name || fields.assignee?.displayName || 'Unassigned');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(issue);
  }

  return Array.from(groups.entries()).map(([name, groupedIssues]) => ({
    name,
    total: groupedIssues.length,
    blocked: groupedIssues.filter((issue) => /blocked|blocker/i.test(String(issue?.fields?.status?.name || ''))).length,
    highRisk: groupedIssues.filter((issue) => {
      const fields = issue?.fields || {};
      const priority = String(fields.priority?.name || '').toLowerCase();
      const labels = Array.isArray(fields.labels) ? fields.labels.map((label) => String(label).toLowerCase()) : [];
      return priority.includes('highest') || priority.includes('critical') || priority.includes('blocker') || labels.includes('blocker');
    }).length
  }));
}

function buildActions(issues) {
  return issues
    .filter((issue) => /decision|approve|clarify|confirm/i.test(`${issue?.fields?.status?.name || ''} ${issue?.fields?.summary || ''}`))
    .slice(0, 10)
    .map((issue) => ({
      issueKey: normalizeText(issue?.key || ''),
      summary: normalizeText(issue?.fields?.summary || ''),
      owner: normalizeText(issue?.fields?.assignee?.displayName || issue?.fields?.reporter?.displayName || 'Unassigned'),
      status: normalizeText(issue?.fields?.status?.name || 'Unknown')
    }));
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
  return {
    id: normalizeText(page?.id || ''),
    title: normalizeText(page?.title || ''),
    spaceKey: normalizeText(page?.space?.key || ''),
    bodyText: stripHtml(page?.body?.storage?.value || page?.excerpt || '').slice(0, 1200)
  };
}

function compactIssueRecord(record) {
  return {
    issueKey: record?.issueKey || '',
    issueType: record?.issueType || '',
    summary: record?.summary || '',
    status: record?.status || '',
    owner: record?.owner || '',
    risk: record?.risk?.label || 'unknown',
    confidence: record?.confidence?.label || 'unknown'
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
  sourceLinks
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
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        store: false,
        reasoning: { effort: 'low' },
        input: [
          {
            role: 'system',
            content:
              'You are an executive PMO analyst. Use only the supplied Jira and Confluence data. Do not invent facts, dates, owners, risks, or metrics. If information is missing, say so plainly. Return a concise executive readout with these sections: Executive summary, Top risks, Recommended actions, and Confidence.'
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
                confluencePages: Array.isArray(confluencePages) ? confluencePages.map(compactConfluencePage) : [],
                sourceLinks
              },
              null,
              2
            )
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429 && body.includes('insufficient_quota')) {
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
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchConfluenceSpaces() {
  try {
    const payload = await requestJson(route`/wiki/api/v2/spaces?limit=${100}`, {}, 'confluence');
    const seen = new Map();
    for (const space of Array.isArray(payload.results) ? payload.results : []) {
      const key = normalizeText(space?.key || '');
      const name = normalizeText(space?.name || key || 'Space');
      if (key && !seen.has(key)) {
        seen.set(key, { id: key, name: `${name} (${key})` });
      }
    }

    const options = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
    return [{ id: DEFAULT_CONFLUENCE_SPACE_KEY, name: `${DEFAULT_CONFLUENCE_SPACE_KEY} (default)` }, ...options];
  } catch (error) {
    return [{ id: DEFAULT_CONFLUENCE_SPACE_KEY, name: `${DEFAULT_CONFLUENCE_SPACE_KEY} (default)` }];
  }
}

async function fetchConfluenceSnapshot(confluenceSpaceKey = DEFAULT_CONFLUENCE_SPACE_KEY) {
  const spaceKey = normalizeText(confluenceSpaceKey || DEFAULT_CONFLUENCE_SPACE_KEY);
  if (!spaceKey) {
    return { pages: [], source: null };
  }

  try {
    const cql = `space="${spaceKey}" AND type=page`;
    const search = await requestJson(route`/wiki/rest/api/search?cql=${cql}&limit=${10}&expand=version,space`, {}, 'confluence');
    const results = Array.isArray(search.results) ? search.results : [];
    const pageIds = results
      .map((result) => normalizeText(result?.content?.id || result?.id || ''))
      .filter(Boolean)
      .slice(0, 10);

    const pages = await Promise.all(
      pageIds.map(async (pageId) => {
        try {
          return await requestJson(route`/wiki/rest/api/content/${pageId}?expand=version,space,body.storage`, {}, 'confluence');
        } catch (error) {
          return null;
        }
      })
    );

    return {
      pages: pages.filter(Boolean),
      source: {
        spaceKey,
        cql,
        endpoint: '/wiki/rest/api/search'
      }
    };
  } catch (error) {
    return { pages: [], source: null };
  }
}

function buildSourceLinks({ jql, confluenceSnapshot, confluenceSpaceKey, refreshedAt }) {
  return {
    jira: {
      system: 'Jira',
      endpoint: '/rest/api/3/search/jql',
      jql,
      transformationSummary: 'Fetched live issues and derived dashboard metrics from Jira fields.',
      lastRefresh: refreshedAt
    },
    confluence: {
      system: 'Confluence',
      endpoint: confluenceSnapshot?.source?.endpoint || '/wiki/rest/api/search',
      spaceKey: confluenceSpaceKey || confluenceSnapshot?.source?.spaceKey || DEFAULT_CONFLUENCE_SPACE_KEY,
      cql:
        confluenceSnapshot?.source?.cql ||
        `space="${confluenceSpaceKey || DEFAULT_CONFLUENCE_SPACE_KEY}" AND type=page`,
      transformationSummary: confluenceSnapshot?.pages?.length
        ? 'Fetched pages from the selected Confluence space.'
        : 'No pages were found in the selected Confluence space.',
      lastRefresh: refreshedAt
    },
    openai: {
      system: 'OpenAI',
      endpoint: '/v1/responses',
      model: OPENAI_MODEL,
      transformationSummary: 'Analyzed only the live Jira and Confluence payload supplied by the backend resolver.',
      lastRefresh: refreshedAt
    }
  };
}

function buildEmptyDashboardResponse({ payload = {}, refreshedAt = new Date().toISOString(), settings = {} } = {}) {
  const releaseId = normalizeText(payload.releaseId || settings.defaultReleaseId || DEFAULT_RELEASE_ID);
  const team = normalizeText(payload.team || settings.defaultTeam || DEFAULT_TEAM);
  const confluenceSpaceKey = normalizeText(payload.confluenceSpaceKey || settings.defaultConfluenceSpaceKey || DEFAULT_CONFLUENCE_SPACE_KEY);
  const jql = buildJql({ releaseId, team, view: payload.view }, settings);
  const sourceLinks = buildSourceLinks({
    jql,
    confluenceSnapshot: { pages: [], source: null },
    confluenceSpaceKey,
    refreshedAt
  });

  return {
    releaseOptions: DEFAULT_RELEASE_OPTIONS,
    teamOptions: DEFAULT_TEAM_OPTIONS,
    confluenceSpaceOptions: [{ id: confluenceSpaceKey, name: `${confluenceSpaceKey} (default)` }],
    viewOptions: DEFAULT_VIEW_OPTIONS,
    issues: [],
    dashboard: {
      scope: { releaseId, team, confluenceSpaceKey },
      summary: {
        total: 0,
        visible: 0,
        jql,
        refreshedAt,
        sourceSystem: 'Jira'
      },
      metrics: { highRisk: 0, mediumRisk: 0, blockers: 0, decisionsNeeded: 0 },
      workstreams: [],
      actions: [],
      aiSummary: null,
      baselineSnapshot: { sourceSystem: 'Confluence', pages: 0 },
      committedScope: { sourceSystem: 'Jira', issues: 0 },
      releaseSnapshot: { sourceSystem: 'Jira', releaseId },
      sourceLinks,
      records: [],
      cardData: {},
      cardStates: { jira: 'empty', confluence: 'empty', openai: 'empty' }
    }
  };
}

resolver.define('getDashboardData', async ({ payload }) => {
  const settings = await readSettings();
  const releaseId = normalizeText(payload?.releaseId || settings.defaultReleaseId || DEFAULT_RELEASE_ID);
  const team = normalizeText(payload?.team || settings.defaultTeam || DEFAULT_TEAM);
  const confluenceSpaceKey = normalizeText(
    payload?.confluenceSpaceKey || settings.defaultConfluenceSpaceKey || DEFAULT_CONFLUENCE_SPACE_KEY
  );
  const view = normalizeText(payload?.view || 'Executive');
  const refreshedAt = new Date().toISOString();

  try {
    const baseFilter = buildJqlFilterParts({ releaseId, team }, settings).join(' AND ');
    const jql = buildJql({ releaseId, team, view }, settings);
    const issues = await fetchJiraIssues(jql);
    const confluenceSnapshot = await fetchConfluenceSnapshot(confluenceSpaceKey);
    const [releaseOptions, teamOptions, confluenceSpaceOptions] = await Promise.all([
      Promise.resolve(buildReleaseOptions(issues)),
      Promise.resolve(buildTeamOptions(issues)),
      fetchConfluenceSpaces()
    ]);

    const normalizedRecords = issues.map(normalizeJiraIssue);
    const metrics = buildMetrics(issues);
    const workstreams = buildWorkstreams(issues);
    const actions = buildActions(issues);
    const sourceLinks = buildSourceLinks({ jql, confluenceSnapshot, confluenceSpaceKey, refreshedAt });
    const cardData = {};
    const cardJqlClauses = {
      metrics: 'priority in (Highest, High) OR labels = blocker OR status = Blocked',
      executiveTakeaway: 'priority in (Highest, High) OR labels = blocker OR status in ("Blocked", "In Progress")',
      workstreamHealth: '',
      baselineSnapshot: 'labels = baseline OR summary ~ "baseline"',
      committedScope: 'status not in ("Cancelled", "Out of Scope", "Done")',
      releaseRisks: 'priority in (Highest, High) OR labels = blocker OR status = Blocked',
      executiveActions: 'priority in (Highest, High) OR labels = blocker OR status in ("Blocked", "In Progress")'
    };

    for (const [cardKey, clause] of Object.entries(cardJqlClauses)) {
      if (!clause) {
        cardData[cardKey] = { records: normalizedRecords, jql };
        continue;
      }

      const cardIssues = await fetchJiraIssues(buildCardJql(baseFilter, clause, view));
      cardData[cardKey] = {
        records: cardIssues.map(normalizeJiraIssue),
        jql: buildCardJql(baseFilter, clause, view)
      };
    }

    let aiSummary = null;
    try {
      aiSummary = await summarizeWithOpenAI({
        summary: {
          total: issues.length,
          visible: issues.length,
          jql,
          refreshedAt,
          sourceSystem: 'Jira',
          releaseId,
          team,
          confluenceSpaceKey
        },
        metrics,
        workstreams,
        actions,
        records: normalizedRecords.slice(0, 25),
        confluencePages: confluenceSnapshot.pages.slice(0, 10),
        sourceLinks
      });
    } catch (error) {
      aiSummary = null;
    }

    return {
      releaseOptions,
      teamOptions,
      confluenceSpaceOptions,
      viewOptions: DEFAULT_VIEW_OPTIONS,
      issues,
      dashboard: {
        scope: { releaseId, team, confluenceSpaceKey },
        summary: {
          total: issues.length,
          visible: issues.length,
          jql,
          refreshedAt,
          sourceSystem: 'Jira'
        },
        metrics,
        workstreams,
        actions,
        aiSummary,
        baselineSnapshot: {
          sourceSystem: 'Confluence',
          pages: confluenceSnapshot.pages.length
        },
        committedScope: {
          sourceSystem: 'Jira',
          issues: issues.length
        },
        releaseSnapshot: {
          sourceSystem: 'Jira',
          releaseId
        },
        sourceLinks,
        records: normalizedRecords,
        cardData,
        cardStates: {
          jira: issues.length > 0 ? 'loaded' : 'empty',
          confluence: confluenceSnapshot.pages.length > 0 ? 'loaded' : 'empty',
          openai: aiSummary ? 'loaded' : 'empty'
        }
      }
    };
  } catch (error) {
    return buildEmptyDashboardResponse({ payload, refreshedAt, settings });
  }
});

module.exports.handler = resolver.getDefinitions(