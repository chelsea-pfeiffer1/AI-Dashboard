export const sourceConfig = {
  defaultReleaseId: 'VMSv26.05.00',
  defaultTeam: 'Executive',
  defaultView: 'Executive',
};

export const dashboardSources = {
  releases: [
    {
      id: 'VMSv26.05.00',
      name: 'VMS v26.05.00',
      jiraFilter: 'fixVersion = "VMSv26.05.00"',
    },
    {
      id: 'VMSv26.06.00',
      name: 'VMS v26.06.00',
      jiraFilter: 'fixVersion = "VMSv26.06.00"',
    },
  ],
  teams: [
    { id: 'Executive', name: 'Executive' },
    { id: 'PMO', name: 'PMO' },
    { id: 'QA', name: 'QA' },
    { id: 'Mobile', name: 'Mobile' },
    { id: 'Platform', name: 'Platform' },
  ],
  views: ['Executive', 'Delivery', 'QA', 'Team'],
};