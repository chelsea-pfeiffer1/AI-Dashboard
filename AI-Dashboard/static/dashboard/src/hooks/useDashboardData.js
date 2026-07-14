import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardTemplate } from '../templates/dashboardTemplate';
import { getDashboardData } from '../services/jiraService';

const DEFAULT_RELEASE_OPTIONS = [{ id: '', name: 'Select a release' }];
const DEFAULT_CONFLUENCE_SPACE_OPTIONS = [
  { id: '', name: 'Select a Confluence Space' },
];

function normalizeJiraIssue(issue) {
  const fields = issue?.fields || {};
  const summary = fields.summary || 'No summary';
  const issueType = fields.issuetype?.name || 'Issue';
  const status = fields.status?.name || 'Unknown';
  const owner =
    fields.assignee?.displayName ||
    fields.reporter?.displayName ||
    'Unassigned';

  const priority = String(fields.priority?.name || '').toLowerCase();
  const labels = Array.isArray(fields.labels)
    ? fields.labels.map((label) => String(label).toLowerCase())
    : [];

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
    risk = 'high';
  } else if (priority.includes('medium') || labels.includes('medium')) {
    risk = 'medium';
  }

  let confidence = 'low';
  if (/done|closed|resolved/i.test(status)) {
    confidence = 'high';
  } else if (risk === 'low') {
    confidence = 'medium';
  }

  return {
    issueKey: issue?.key || fields.key || summary,
    issueType,
    summary,
    status,
    owner,
    risk: { label: risk },
    confidence: { label: confidence },
  };
}

function buildDerivedMetrics(records) {
  const highRisk = records.filter((record) => record.risk.label === 'high').length;
  const mediumRisk = records.filter((record) => record.risk.label === 'medium').length;
  const blockers = records.filter((record) =>
    /blocked|blocker/i.test(`${record.status} ${record.summary}`)
  ).length;
  const decisionsNeeded = records.filter((record) =>
    /decision|approve|clarify|confirm/i.test(`${record.status} ${record.summary}`)
  ).length;

  return { highRisk, mediumRisk, blockers, decisionsNeeded };
}

function mergeDashboard(response, records) {
  const derivedMetrics = buildDerivedMetrics(records);

  return {
    ...dashboardTemplate,
    ...(response?.dashboard || {}),
    summary: {
      ...dashboardTemplate.summary,
      ...(response?.dashboard?.summary || {}),
      total: response?.dashboard?.summary?.total ?? records.length,
      visible: response?.dashboard?.summary?.visible ?? records.length,
      jql:
        response?.dashboard?.summary?.jql ||
        dashboardTemplate.summary?.jql ||
        '',
    },
    metrics: {
      ...dashboardTemplate.metrics,
      ...(response?.dashboard?.metrics || {}),
      ...derivedMetrics,
    },
    records,
    releaseSnapshot: {
      ...dashboardTemplate.releaseSnapshot,
      ...(response?.dashboard?.releaseSnapshot || {}),
    },
    workstreams: response?.dashboard?.workstreams || dashboardTemplate.workstreams || [],
    actions: response?.dashboard?.actions || dashboardTemplate.actions || [],
    baselineSnapshot: {
      ...dashboardTemplate.baselineSnapshot,
      ...(response?.dashboard?.baselineSnapshot || {}),
    },
    committedScope: {
      ...dashboardTemplate.committedScope,
      ...(response?.dashboard?.committedScope || {}),
    },
    sourceLinks: {
      ...dashboardTemplate.sourceLinks,
      ...(response?.dashboard?.sourceLinks || {}),
    },
    cardStates: {
      ...dashboardTemplate.cardStates,
      ...(response?.dashboard?.cardStates || {}),
    },
  };
}

function getErrorMessage(error) {
  if (!error) {
    return '';
  }

  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : error?.message ||
        (typeof error?.toString === 'function'
          ? String(error.toString())
          : 'Unable to load dashboard data.');

  const normalized = String(message).trim();
  if (!normalized || normalized === 'undefined' || normalized === '[object Undefined]') {
    return 'Unable to load dashboard data.';
  }

  return normalized;
}

export default function useDashboardData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(dashboardTemplate.filters);
  const [dashboard, setDashboard] = useState(dashboardTemplate);

  const [releaseOptions, setReleaseOptions] = useState(DEFAULT_RELEASE_OPTIONS);
  const [confluenceSpaceOptions, setConfluenceSpaceOptions] = useState(
    DEFAULT_CONFLUENCE_SPACE_OPTIONS
  );

  const requestIdRef = useRef(0);

  const updateConfig = useCallback((patch) => {
    setConfig((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(dashboardTemplate.filters);
  }, []);

  const refresh = useCallback(
    async (overrideConfig = {}, { showLoading = false } = {}) => {
      const requestId = ++requestIdRef.current;
      const effectiveConfig = {
        ...config,
        ...overrideConfig,
        releaseId: String((overrideConfig.releaseId ?? config.releaseId) || '').trim(),
        confluenceSpaceKey: String(
          (overrideConfig.confluenceSpaceKey ?? config.confluenceSpaceKey) || ''
        ).trim(),
      };

      if (showLoading) {
        setLoading(true);
      }
      setError('');

      try {
        const response = await getDashboardData({
          releaseId: effectiveConfig.releaseId,
          team: effectiveConfig.team || '',
          confluenceSpaceKey: effectiveConfig.confluenceSpaceKey,
          view: effectiveConfig.view,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const nextReleaseOptions = Array.isArray(response?.releaseOptions)
          ? response.releaseOptions
          : DEFAULT_RELEASE_OPTIONS;

        const nextConfluenceSpaceOptions = Array.isArray(response?.confluenceSpaceOptions)
          ? response.confluenceSpaceOptions
          : DEFAULT_CONFLUENCE_SPACE_OPTIONS;

        const rawIssues = Array.isArray(response?.issues) ? response.issues : [];
        const normalizedRecords = rawIssues.map(normalizeJiraIssue);

        setReleaseOptions(nextReleaseOptions);
        setConfluenceSpaceOptions(nextConfluenceSpaceOptions);
        setDashboard(mergeDashboard(response, normalizedRecords));
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error('Failed to load dashboard data:', caughtError);
        setError(getErrorMessage(caughtError));
      } finally {
        if (requestId === requestIdRef.current && showLoading) {
          setLoading(false);
        }
      }
    },
    [config]
  );

  useEffect(() => {
    refresh({}, { showLoading: false });
  }, [refresh]);

  return {
    loading,
    error,
    config,
    dashboard,
    updateConfig,
    resetConfig,
    refresh,
    releaseOptions,
    confluenceSpaceOptions,
  };
}