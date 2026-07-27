import { buildDashboardViewModel } from './dashboardViewModel';

test('derives completion, activity, blockers, and confidence consistently', () => {
  const view = buildDashboardViewModel({
    metrics: { analysisAvailable: true },
    aiAnalysis: {
      confidence: { score: 91, label: 'on_track' },
      risks: []
    },
    records: [
      { issueKey: 'VMS-1', status: 'Ready for Release' },
      { issueKey: 'VMS-2', status: 'Abandoned' },
      { issueKey: 'VMS-3', status: 'In Progress' },
      { issueKey: 'VMS-4', status: 'Blocked' }
    ]
  });

  expect(view.completed).toBe(2);
  expect(view.active).toBe(1);
  expect(view.blocked).toBe(1);
  expect(view.completionPercent).toBe(50);
  expect(view.confidenceLabel).toBe('On track');
  expect(view.confidenceTone).toBe('green');
});
