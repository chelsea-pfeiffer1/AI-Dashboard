# AI Dashboard takeover guide

This is a standalone walkthrough for the person taking ownership of the AI
Release Dashboard. It does not change the application or automate deployment.
Complete the access-transfer steps before the current owner leaves.

## Continuity rule: keep the current app running

Taking ownership does not require a new app, a new installation, or a new
deployment. The existing production app must remain installed exactly where it
is.

During the takeover:

- Do not run `forge create`.
- Do not run `forge register`.
- Do not change the app ID in `manifest.yml`.
- Do not uninstall or reinstall the production app.
- Do not run `forge deploy` or `forge install --upgrade` merely to transfer
  ownership.
- Do not change production environment variables unless a credential actually
  must be rotated.

The Forge app ID connects the repository to the existing app, deployment,
installation, storage, and saved dashboard data. Ownership and contributor
changes are access-control changes; they do not move or recreate the app.

## 1. Understand what you are taking over

The dashboard is an Atlassian Forge app:

- GitHub repository: `https://github.com/chelsea-pfeiffer1/AI-Dashboard`
- Forge app ID: `ari:cloud:ecosystem::app/83d30c9b-ec7c-4bf9-92ab-b7c2ae7b90f2`
- Product entry point: Confluence global page
- Backend: `AI-Dashboard/src/index.js`
- Forge configuration: `AI-Dashboard/manifest.yml`
- Frontend: `AI-Dashboard/static/dashboard`
- Backend tests: `AI-Dashboard/test`

There is no separately hosted web server or database. Atlassian Forge runs the
backend and provides app storage. The backend reads Jira and Confluence data and
uses the OpenAI API for the optional AI analysis.

## 2. Have the departing owner transfer access

The departing owner should complete these steps while their accounts still
work:

1. Add you to the GitHub repository with permission to create branches, merge
   pull requests, and manage repository settings.
2. Transfer the repository to you or to an organization if it should no longer
   remain under the departing owner's personal GitHub account.
3. Open the [Atlassian developer console](https://developer.atlassian.com/console/myapps/),
   select the Forge app shown above, open **Contributors**, and add you as an
   **Admin** or **Deployer**.
4. Transfer ownership of the Forge app to you or another permanent owner.
   GitHub access by itself does not grant permission to deploy this app.
5. Ensure you are an administrator of the Atlassian site where the app is
   installed, or identify the administrator who will approve installations and
   permission upgrades.
6. Give you access to the OpenAI API project used by the app and confirm its
   billing remains active. Keep the currently deployed key in place during the
   handoff if organizational policy permits. If the key belongs personally to
   the departing owner, schedule a controlled rotation after ownership is
   transferred.
7. Record the production Atlassian site URL and the intended non-secret
   environment settings in the team's approved password manager or operations
   system.
8. Wait to remove the old owner until the new owner can open and operate the
   existing production dashboard and can see the app in the developer console.

Atlassian's contributor and ownership instructions are available at
[Manage app contributors](https://developer.atlassian.com/platform/forge/manage-app-contributors/).

## 3. Install the workstation tools

Install:

- Git
- Node.js 24 and npm
- Visual Studio Code
- Atlassian Forge CLI
- Codex desktop or the Codex IDE extension, if you will use Codex

In PowerShell, install the current Forge CLI:

```powershell
npm.cmd install --global @forge/cli@latest
forge.cmd --version
```

Using `npm.cmd` and `forge.cmd` avoids the common Windows error where
PowerShell blocks the corresponding `.ps1` command shims.

## 4. Clone the GitHub repository

Choose a local development folder and run:

```powershell
cd C:\Users\<your-user>\Documents\GitHub
git clone https://github.com/chelsea-pfeiffer1/AI-Dashboard.git
cd .\AI-Dashboard
git remote -v
git status
code .
```

The outer folder is the Git repository:

```text
...\GitHub\AI-Dashboard
```

The Forge app is inside it:

```text
...\GitHub\AI-Dashboard\AI-Dashboard
```

Run Forge commands from the inner Forge app folder.

## 5. Set up Codex for the repository

1. Sign in to Codex.
2. Open or add the outer `...\GitHub\AI-Dashboard` folder as the project.
3. Confirm Codex can see the repository's `main` branch and `origin` remote.
4. Ask Codex to read `AI-Dashboard/AGENTS.md` before making application changes.
5. Authorize the GitHub connector in Codex if you want Codex to work with pull
   requests or cloud tasks. Local editing can use the cloned repository without
   storing application secrets in Codex.
6. Work on a feature branch instead of committing directly to `main`.

Example:

```powershell
git switch -c codex/short-change-description
```

Never paste the OpenAI API key, an Atlassian API token, or other production
credentials into a Codex prompt.

## 6. Install the application dependencies

In the VS Code terminal, move to the inner Forge app:

```powershell
cd .\AI-Dashboard
npm.cmd install
```

Install the frontend dependencies:

```powershell
cd .\static\dashboard
npm.cmd install
```

Return to the Forge app root:

```powershell
cd ..\..
```

Your terminal should now be in:

```text
...\GitHub\AI-Dashboard\AI-Dashboard
```

## 7. Log in to Atlassian Forge

Run:

```powershell
forge.cmd login
forge.cmd settings list
```

Use the Atlassian account that was added as a contributor to the existing Forge
app. Do not create or register a new Forge app; the existing app ID in
`manifest.yml` must be preserved.

## 8. Review the existing environment without changing it

Each Forge environment has separate variables. List the configured keys:

```powershell
forge.cmd variables list --environment development
forge.cmd variables list --environment staging
forge.cmd variables list --environment production
```

The supported optional variables are:

- `DEFAULT_RELEASE_ID`
- `DEFAULT_TEAM`
- `CONFLUENCE_SPACE_KEY`
- `OPENAI_MODEL`
- `OPENAI_TIMEOUT_MS`

Do not re-enter, unset, or replace these variables just because ownership is
changing. Encrypted values do not need to be copied to the successor's
computer. They belong to the existing Forge app environment and continue to be
used by the deployed app.

If a production credential must eventually be replaced, plan that as a
separate maintenance release. A Forge variable change takes effect only after
that same environment is deployed again.

## 9. Optionally validate the local clone

From the Forge app root, run the backend tests:

```powershell
node --test "test/**/*.test.js"
```

Run the frontend tests and production build:

```powershell
cd .\static\dashboard
npm.cmd test -- --watchAll=false
npm.cmd run build
cd ..\..
```

Validate the Forge app:

```powershell
forge.cmd lint
```

These commands only validate the local copy. They do not change the installed
app. Do not deploy as part of the ownership handoff.

## 10. Verify the existing production app without changing it

1. Sign in to the existing production Atlassian site.
2. Open Confluence.
3. Open **Apps**, then **AI Dashboard**.
4. Generate a readout using a Jira fix version and Confluence space you can
   access.
5. Confirm Jira data, Confluence evidence, and the AI analysis still load.
6. Open an existing saved dashboard snapshot, if one is available.
7. In the Atlassian developer console, confirm you can see the existing app,
   its production environment, deployment history, and installation.

Do not reinstall, upgrade, or redeploy the app to perform this verification.

## Future maintenance only

The remaining commands are for future, approved application changes. They are
not takeover steps.

## 11. Deploy a future change to development

From the inner Forge app root:

```powershell
forge.cmd deploy --non-interactive -e development
```

For the first installation on a site:

```powershell
forge.cmd install --non-interactive --site https://<site>.atlassian.net --product confluence --environment development
```

If the app is already installed and `manifest.yml` changed scopes or
permissions:

```powershell
forge.cmd install --non-interactive --upgrade --site https://<site>.atlassian.net --product confluence --environment development
```

Ordinary code-only changes require deployment but do not require another
installation.

## 12. Test a future development deployment

1. Sign in to the development Atlassian site.
2. Open Confluence.
3. Open **Apps**, then **AI Dashboard**.
4. Generate a readout using a Jira fix version and Confluence space you can
   access.
5. Confirm Jira data, Confluence evidence, and the AI analysis load.
6. Save and reopen a dashboard snapshot if that feature is part of the release.
7. Confirm links open only information the signed-in user is allowed to view.

For recent development logs:

```powershell
forge.cmd logs --environment development --since 15m --limit 100 --grouped
```

## 13. Promote a future release to staging

After the development smoke test:

```powershell
git switch main
git pull --ff-only
```

Repeat the tests, build, and lint from step 9. Then deploy:

```powershell
forge.cmd deploy --non-interactive -e staging
```

If staging needs a first installation or permission upgrade, repeat the
appropriate install command using `--environment staging`.

## 14. Deploy a future release to production

Before production:

- Confirm the exact Git commit being released.
- Confirm production variable keys exist.
- Confirm a recent staging smoke test passed.
- Confirm the person deploying has the Forge Admin or Deployer role.
- Confirm a site administrator is available if permissions changed.

Deploy from the inner Forge app root:

```powershell
forge.cmd deploy --non-interactive -e production
```

For a first production installation:

```powershell
forge.cmd install --non-interactive --site https://<site>.atlassian.net --product confluence --environment production
```

After a scope or permission change:

```powershell
forge.cmd install --non-interactive --upgrade --site https://<site>.atlassian.net --product confluence --environment production
```

Do not use `--no-verify`.

These production commands target the same existing Forge app and installation.
They must never be used to create a replacement app for this handoff.

## 15. Complete the ownership transition

After the new owner has verified the existing production app successfully:

1. Verify the new owner can access GitHub settings and merge a pull request.
2. Verify the new owner appears as the Forge app owner or intended permanent
   administrator.
3. Verify ownership and billing access for the existing OpenAI API project.
4. Revoke personal Atlassian API tokens that are no longer needed. Rotate the
   deployed OpenAI key only through a planned maintenance release if required.
5. Remove the departing owner's GitHub and Forge access if appropriate.
6. Store site URLs, support contacts, configuration decisions, and release
   records in the team's permanent operations system.

## Final takeover checklist

- [ ] GitHub repository access transferred.
- [ ] Forge contributor role assigned.
- [ ] Forge ownership transferred.
- [ ] Atlassian site administrator identified.
- [ ] OpenAI API project ownership and billing continuity confirmed.
- [ ] Personal credentials reviewed and any required rotation scheduled.
- [ ] Repository cloned and opened in VS Code.
- [ ] Codex can access the local repository, if used.
- [ ] Backend tests pass.
- [ ] Frontend tests and build pass.
- [ ] Forge lint passes.
- [ ] Existing production dashboard works without a redeploy or reinstall.
- [ ] Existing production installation and deployment history are visible.
- [ ] Production deployment responsibility is documented.
