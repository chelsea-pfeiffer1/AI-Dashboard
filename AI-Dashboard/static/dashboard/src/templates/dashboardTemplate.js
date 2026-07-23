export const dashboardTemplate = {
  filters: {
    releaseId: '',
    team: 'VMS',
    confluenceSpaceKey: '',
    slackConversationIds: '',
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
  slackItems: [],
  aiSummary: null,
  aiAnalysis: null,
  aiStatus: {
    state: 'empty',
    code: 'not_run',
    message: 'AI analysis has not run.'
  },
  releaseSnapshot: {
    sourceSystem: 'Jira',
    releaseId: '',
    targetDate: '',
    daysUntilRelease: null,
    scheduleDataAvailable: false
  },
  releaseTrend: {
    hasBaseline: false,
    previousCapturedAt: '',
    confidenceDelta: null,
    totalDelta: null,
    completedDelta: null,
    blockedDelta: null,
    highRiskDelta: null,
    targetDateChanged: false,
    previousTargetDate: '',
    addedIssueKeys: [],
    removedIssueKeys: [],
    history: []
  },
  raidRegister: [],
  dependencySignals: [],
  readiness: {
    recommendation: 'conditional',
    failCount: 0,
    warningCount: 0,
    gates: []
  },
  deliveryForecast: {
    state: 'insufficient_data',
    expectedDate: '',
    bestCaseDate: '',
    worstCaseDate: '',
    weeklyThroughput: 0,
    probability: null,
    rationale: 'Generate a readout to calculate a forecast.'
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
    slack: null,
    openai: null
  },
  cardData: {},
  cardStates: {
    jira: 'empty',
    confluence: 'empty',
    slack: 'empty',
    openai: 'empty'
  },
  scope: {
    releaseId: '',
    team: 'VMS',
    confluenceSpaceKey: '',
    slackConversationIds: []
  }
};
