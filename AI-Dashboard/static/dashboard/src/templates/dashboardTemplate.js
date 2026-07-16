export const dashboardTemplate = {
  filters: {
    releaseId: 'VMSv26.06.00 (GA: 07/30)',
    team: 'VMS',
    confluenceSpaceKey: 'PS',
    view: 'Executive'
  },
  summary: {
    total: 0,
    visible: 0,
    jql: '',
    refreshedAt: '',
    sourceSystem: 'Jira'
  },
  metrics: {
    highRisk: 0,
    mediumRisk: 0,
    blockers: 0,
    decisionsNeeded: 0,
    analysisAvailable: false
  },
  records: [],
  workstreams: [],
  actions: [],
  confluenceItems: [],
  aiSummary: null,
  aiAnalysis: null,
  aiStatus: {
    state: 'empty',
    code: 'not_run',
    message: 'AI analysis has not run.'
  },
  releaseSnapshot: {
    sourceSystem: 'Jira',
    releaseId: 'VMSv26.06.00 (GA: 07/30)'
  },
  baselineSnapshot: {
    sourceSystem: 'Confluence',
    pages: 0
  },
  committedScope: {
    sourceSystem: 'Jira',
    issues: 0
  },
  sourceLinks: {
    jira: null,
    confluence: null,
    openai: null
  },
  cardData: {},
  cardStates: {
    jira: 'loading',
    confluence: 'loading',
    openai: 'loading'
  },
  scope: {
    releaseId: 'VMSv26.06.00 (GA: 07/30)',
    team: 'VMS',
    confluenceSpaceKey: 'PS'
  }
};
