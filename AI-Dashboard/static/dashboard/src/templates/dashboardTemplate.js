export const dashboardTemplate = {
  filters: {
    releaseId: '',
    confluenceSpaceKey: '',
    view: 'Executive',
  },
  summary: {
    total: 0,
    visible: 0,
    jql: '',
    refreshedAt: '',
    sourceSystem: 'Jira',
  },
  metrics: {
    highRisk: 0,
    mediumRisk: 0,
    blockers: 0,
    decisionsNeeded: 0,
  },
  records: [],
  releaseSnapshot: {
    sourceSystem: 'Jira',
  },
  workstreams: [],
  actions: [],
  baselineSnapshot: {
    sourceSystem: 'Confluence',
  },
  committedScope: {
    sourceSystem: 'Jira',
  },
  sourceLinks: {
    jira: null,
    confluence: null,
    openai: null,
  },
  cardData: {},
  cardStates: {
    jira: 'loading',
    confluence: 'loading',
    openai: 'loading',
  },
};