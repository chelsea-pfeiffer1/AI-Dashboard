import { getDashboardData } from './jiraService';
import { invoke } from '@forge/bridge';

jest.mock('@forge/bridge', () => ({
  invoke: jest.fn(),
}));

describe('jiraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws a real Error when invoke rejects with a non-Error value', async () => {
    invoke.mockRejectedValueOnce(undefined);

    await expect(
      getDashboardData({ releaseId: '', team: '', confluenceSpaceKey: '', view: 'Executive' })
    ).rejects.toThrow('Failed to load dashboard data');
  });

  it('preserves Error objects from invoke rejections', async () => {
    const expectedError = new Error('Jira failure');
    invoke.mockRejectedValueOnce(expectedError);

    await expect(
      getDashboardData({ releaseId: '', team: '', confluenceSpaceKey: '', view: 'Executive' })
    ).rejects.toBe(expectedError);
  });

  it('converts plain-object rejections into a friendly Error', async () => {
    invoke.mockRejectedValueOnce({});

    await expect(
      getDashboardData({ releaseId: '', team: '', confluenceSpaceKey: '', view: 'Executive' })
    ).rejects.toThrow('Failed to load dashboard data');
  });
});
