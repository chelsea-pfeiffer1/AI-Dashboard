import { useCallback, useEffect, useMemo, useState } from 'react';
import { dashboardTemplate } from '../templates/dashboardTemplate';
import { getDashboardData } from '../services/dashboardService';

const STORAGE_KEY = 'forge-ai-dashboard-config-v2';

function readStoredConfig() {
  if (typeof window === 'undefined') {
    return dashboardTemplate.filters;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return dashboardTemplate.filters;
    }

    const parsed = JSON.parse(raw);
    return {
      ...dashboardTemplate.filters,
      ...parsed,
      // Release and space are intentionally session-scoped selections. Clearing
      // them here prevents either a saved choice or an old default from silently
      // determining which Jira and Confluence data loads on a later visit.
      releaseId: '',
      confluenceSpaceKey: '',
      slackConversationIds: ''
    };
  } catch {
    return dashboardTemplate.filters;
  }
}

function getErrorMessage(error) {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  return String(error?.message || error?.toString?.() || 'Unable to load dashboard data').trim();
}

function mergeDashboard(response) {
  const nextDashboard = response?.dashboard || {};
  return {
    ...dashboardTemplate,
    ...nextDashboard,
    summary: {
      ...dashboardTemplate.summary,
      ...(nextDashboard.summary || {})
    },
    metrics: {
      ...dashboardTemplate.metrics,
      ...(nextDashboard.metrics || {})
    },
    releaseSnapshot: {
      ...dashboardTemplate.releaseSnapshot,
      ...(nextDashboard.releaseSnapshot || {})
    },
    releaseTrend: {
      ...dashboardTemplate.releaseTrend,
      ...(nextDashboard.releaseTrend || {}),
      history: Array.isArray(nextDashboard.releaseTrend?.history) ? nextDashboard.releaseTrend.history : []
    },
    readiness: {
      ...dashboardTemplate.readiness,
      ...(nextDashboard.readiness || {}),
      gates: Array.isArray(nextDashboard.readiness?.gates) ? nextDashboard.readiness.gates : []
    },
    deliveryForecast: {
      ...dashboardTemplate.deliveryForecast,
      ...(nextDashboard.deliveryForecast || {})
    },
    baselineSnapshot: {
      ...dashboardTemplate.baselineSnapshot,
      ...(nextDashboard.baselineSnapshot || {})
    },
    committedScope: {
      ...dashboardTemplate.committedScope,
      ...(nextDashboard.committedScope || {})
    },
    sourceLinks: {
      ...dashboardTemplate.sourceLinks,
      ...(nextDashboard.sourceLinks || {})
    },
    cardStates: {
      ...dashboardTemplate.cardStates,
      ...(nextDashboard.cardStates || {})
    },
    scope: {
      ...dashboardTemplate.scope,
      ...(nextDashboard.scope || {})
    },
    records: Array.isArray(nextDashboard.records) ? nextDashboard.records : [],
    workstreams: Array.isArray(nextDashboard.workstreams) ? nextDashboard.workstreams : [],
    actions: Array.isArray(nextDashboard.actions) ? nextDashboard.actions : [],
    confluenceItems: Array.isArray(nextDashboard.confluenceItems) ? nextDashboard.confluenceItems : [],
    slackItems: Array.isArray(nextDashboard.slackItems) ? nextDashboard.slackItems : [],
    raidRegister: Array.isArray(nextDashboard.raidRegister) ? nextDashboard.raidRegister : [],
    dependencySignals: Array.isArray(nextDashboard.dependencySignals) ? nextDashboard.dependencySignals : [],
    cardData: nextDashboard.cardData || {},
    aiSummary: nextDashboard.aiSummary || null,
    aiAnalysis: nextDashboard.aiAnalysis || null,
    aiStatus: nextDashboard.aiStatus || dashboardTemplate.aiStatus
  };
}

export default function useDashboardData() {
  // Start on the scope picker. Data is loaded only after both required source
  // fields have been explicitly supplied through "Generate readout".
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(() => readStoredConfig());
  const [dashboard, setDashboard] = useState(dashboardTemplate);
  const [releaseOptions, setReleaseOptions] = useState([{ id: 'VMSv26.06.00 (GA: 07/30)', name: 'VMSv26.06.00 (GA: 07/30)' }]);
  const [teamOptions, setTeamOptions] = useState([{ id: 'VMS', name: 'VMS' }]);
  const [confluenceSpaceOptions, setConfluenceSpaceOptions] = useState([{ id: 'PS', name: 'PS (default)' }]);
  const [viewOptions] = useState(['Executive', 'Team', 'Release']);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage failures in Forge browser contexts.
    }
  }, [config]);

  const refresh = useCallback(
    async (overrideConfig = {}, { showLoading = false } = {}) => {
      const effectiveConfig = {
        ...config,
        ...overrideConfig,
        releaseId: String((overrideConfig.releaseId ?? config.releaseId) || '').trim(),
        team: String((overrideConfig.team ?? config.team) || '').trim(),
        confluenceSpaceKey: String((overrideConfig.confluenceSpaceKey ?? config.confluenceSpaceKey) || '').trim(),
        slackConversationIds: String(
          (overrideConfig.slackConversationIds ?? config.slackConversationIds) || ''
        ).trim()
      };

      if (showLoading) {
        setLoading(true);
      }

      setError('');

      try {
        const response = await getDashboardData(effectiveConfig);
        setConfig(effectiveConfig);
        setDashboard(mergeDashboard(response));
        setReleaseOptions(Array.isArray(response?.releaseOptions) ? response.releaseOptions : releaseOptions);
        setTeamOptions(Array.isArray(response?.teamOptions) ? response.teamOptions : teamOptions);
        setConfluenceSpaceOptions(
          Array.isArray(response?.confluenceSpaceOptions) ? response.confluenceSpaceOptions : confluenceSpaceOptions
        );
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [config, releaseOptions, teamOptions, confluenceSpaceOptions]
  );

  const updateConfig = useCallback((patch) => {
    setConfig((current) => ({
      ...current,
      ...patch
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(dashboardTemplate.filters);
  }, []);

  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
}
