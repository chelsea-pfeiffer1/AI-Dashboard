import { isActiveStatus, isBlockedStatus, isDoneStatus } from './statusRules';

const CONFIDENCE_LABELS = {
  on_track: 'On track',
  watch: 'Watch',
  at_risk: 'At risk',
  insufficient_data: 'Insufficient data'
};

export function buildDashboardViewModel(dashboard = {}) {
  const metrics = dashboard.metrics || {};
  const records = Array.isArray(dashboard.records) ? dashboard.records : [];
  const raidRegister = Array.isArray(dashboard.raidRegister) ? dashboard.raidRegister : [];
  const dependencySignals = Array.isArray(dashboard.dependencySignals) ? dashboard.dependencySignals : [];
  const aiAnalysis = dashboard.aiAnalysis || null;
  const analysisAvailable = Boolean(aiAnalysis && metrics.analysisAvailable);
  const completed = records.filter((record) => isDoneStatus(record.status)).length;
  const active = records.filter((record) => isActiveStatus(record.status)).length;
  const blocked = records.filter((record) => isBlockedStatus(record.status)).length;
  const confidenceScore = analysisAvailable
    ? Math.min(Math.max(Number(aiAnalysis?.confidence?.score || 0), 0), 100)
    : 0;
  const registeredDependencyIds = new Set(
    raidRegister
      .filter((entry) => entry.type === 'dependency')
      .map((entry) => String(entry.id || '').replace(/^dependency-/, ''))
  );

  return {
    summary: dashboard.summary || {},
    metrics,
    releaseSnapshot: dashboard.releaseSnapshot || {},
    releaseTrend: dashboard.releaseTrend || {},
    readiness: dashboard.readiness || {},
    deliveryForecast: dashboard.deliveryForecast || {},
    sourceLinks: dashboard.sourceLinks || {},
    cardStates: dashboard.cardStates || {},
    records,
    actions: Array.isArray(dashboard.actions) ? dashboard.actions : [],
    confluenceItems: Array.isArray(dashboard.confluenceItems) ? dashboard.confluenceItems : [],
    raidRegister,
    aiAnalysis,
    aiStatus: dashboard.aiStatus || {},
    aiRisks: Array.isArray(aiAnalysis?.risks) ? aiAnalysis.risks : [],
    analysisAvailable,
    total: records.length,
    completed,
    active,
    blocked,
    completionPercent: records.length ? Math.round((completed / records.length) * 100) : 0,
    confidenceScore,
    confidenceLabel: analysisAvailable
      ? CONFIDENCE_LABELS[aiAnalysis?.confidence?.label] || 'Unknown'
      : 'Awaiting AI',
    confidenceTone: !analysisAvailable
      ? 'neutral'
      : confidenceScore >= 80 ? 'green' : confidenceScore >= 60 ? 'amber' : 'red',
    warningGates: (dashboard.readiness?.gates || []).filter((gate) => gate.status !== 'pass'),
    additionalDependencies: dependencySignals.filter(
      (dependency) => !registeredDependencyIds.has(String(dependency.id || ''))
    )
  };
}
