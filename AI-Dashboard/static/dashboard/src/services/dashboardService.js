import { invoke } from '@forge/bridge';

function normalizeInvokeError(error, fallbackMessage) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }

  if (error && typeof error.message === 'string' && error.message.trim()) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

export async function getDashboardData({ releaseId, team, confluenceSpaceKey, slackConversationIds, view }) {
  try {
    return await invoke('getDashboardData', {
      releaseId,
      team,
      confluenceSpaceKey,
      slackConversationIds,
      view
    });
  } catch (error) {
    throw normalizeInvokeError(error, 'Failed to load dashboard data');
  }
}

export async function listSavedDashboardSnapshots() {
  try {
    return await invoke('listSavedDashboardSnapshots');
  } catch (error) {
    throw normalizeInvokeError(error, 'Failed to load saved dashboards');
  }
}

export async function getSavedDashboardSnapshot(snapshotId) {
  try {
    return await invoke('getSavedDashboardSnapshot', { snapshotId });
  } catch (error) {
    throw normalizeInvokeError(error, 'Failed to open the saved dashboard');
  }
}

export async function saveDashboardSnapshot({ title, note, dashboard }) {
  try {
    return await invoke('saveDashboardSnapshot', { title, note, dashboard });
  } catch (error) {
    throw normalizeInvokeError(error, 'Failed to save the dashboard');
  }
}

export async function deleteSavedDashboardSnapshot(snapshotId) {
  try {
    return await invoke('deleteSavedDashboardSnapshot', { snapshotId });
  } catch (error) {
    throw normalizeInvokeError(error, 'Failed to delete the saved dashboard');
  }
}
