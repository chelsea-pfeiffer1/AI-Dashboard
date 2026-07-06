import { invoke } from '@forge/bridge';

export function getDashboardData({ releaseId, team, view }) {
  return invoke('getDashboardData', {
    releaseId,
    team,
    view,
  });
}