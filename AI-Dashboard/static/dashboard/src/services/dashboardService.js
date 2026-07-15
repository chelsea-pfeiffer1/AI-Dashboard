import { invoke } from '@forge/bridge';

export async function getDashboardData({ releaseId, team, confluenceSpaceKey, view }) {
  try {
    return await invoke('getDashboardData', {
      releaseId,
      team,
      confluenceSpaceKey,
      view
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    if (typeof error === 'string' && error.trim()) {
      throw new Error(error);
    }

    if (error && typeof error.message === 'string' && error.message.trim()) {
      throw new Error(error.message);
    }

    throw new Error('Failed to load dashboard data');
  }
}