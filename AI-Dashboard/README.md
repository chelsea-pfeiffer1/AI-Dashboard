# AI Release Dashboard

The AI Release Dashboard is a Confluence app for reviewing the health of a Jira release. It combines Jira delivery data, supporting Confluence content, and an optional AI analysis into one evidence-linked executive readout.

The dashboard is designed to help release leaders answer four questions:

- What is in the selected release, and how much is complete?
- Is the release likely to meet its Jira target date?
- Which risks, blockers, and decisions need attention?
- Which Jira and Confluence sources support the readout?

> The dashboard is a decision-support tool. Confirm important conclusions in the linked Jira issues and Confluence sources before acting on them.

## Open the dashboard

1. Sign in to the Atlassian site where the app is installed.
2. In Confluence, open **Apps** and select **AI Dashboard**. Depending on the site's navigation, the app may appear under **More** or in the Apps menu.
3. Wait while the dashboard connects to Jira, Confluence, and the analysis service.

You must be able to view the selected Jira work and Confluence space. If content is restricted, the dashboard may show fewer sources or no data.

## Generate a release readout

1. In **Jira fix version**, select a suggestion or enter the exact fix-version name used in Jira. Names are case- and character-sensitive enough that copying the Jira value is safest.
2. In **Confluence space**, select or enter the space key, such as `PS`. Use the short key from the space URL, not the full space name. The field converts the key to uppercase.
3. Optionally enter up to five Slack conversation IDs in **Slack conversations**. Use the `C...`, `G...`, or `D...` ID from each Slack conversation link. The Slack app must be a member of any private conversation it reads.
4. Select **Generate readout**. The first Slack-backed request prompts the current user to connect Slack through Forge-managed OAuth.
5. Review the release name, team, Confluence space, and updated time at the top of the page to confirm the intended scope loaded.

The release, space, and Slack conversation fields start blank on each visit. Select **Refresh data** to rerun the current readout with the latest source data after generating it once.

## Read the dashboard

Use the navigation buttons below the header to jump between sections.

### Overview

Provides the fastest summary of the selected release:

- **Release scope** counts Jira stories and bugs assigned to the selected fix version.
- **Completed** shows issues in a done or completed status and the corresponding percentage of scope.
- **In motion** includes work in progress, review, testing, QA, or development.
- **Confluence sources** counts accessible pages and live documents found in the selected space.
- **Executive readout** summarizes the available delivery and meeting evidence. If AI analysis is unavailable, this area displays its current status instead.

### Release Confidence

Shows an AI-supported assessment of delivery confidence on a 0–100 scale and labels it **On track**, **Watch**, **At risk**, or **Insufficient data**.

The score considers the Jira target date, remaining work, issue status and priority, blockers, aging or overdue items, linked work, and evidence found in Confluence meeting content. Read the rationale with the score; a high completion percentage alone does not guarantee that a release is on track.

The supporting cards show:

- The target release date from the Jira fix version
- Completed scope
- AI-identified high risks and confirmed blockers
- Items for which the evidence indicates an executive decision is needed

An em dash means the AI analysis was not available, not that the value is zero.

### Project Health

Shows the current delivery flow:

- **Complete**: issues whose status is treated as done
- **In motion**: issues in progress, review, testing, QA, or development
- **Other / not started**: all remaining issues
- **Blocked**: issues whose current Jira status contains “blocked” or “blocker”
- **High risk**: Jira issues associated with evidence-backed high-severity risks from the AI analysis

Counts reflect the Jira data at the updated time shown in the header.

### PMO Controls

Provides a governance-oriented view for program managers and stakeholders:

- **Release readiness** evaluates schedule, blockers, critical defects, open decisions, scope completion, and supporting evidence. The result is **Ready**, **Conditional**, or **Not ready**.
- **Confidence and scope trend** compares the current readout with the preceding saved snapshot. It reports changes in confidence, completed scope, blockers, target date, and issue membership.
- **RAID and decision register** consolidates AI-supported risks and decisions with blocked Jira items and critical dependencies. Entries retain owners, status, due dates, actions, and evidence links when those fields are available.
- **Dependency criticality** ranks Jira issue links as normal, watch, or critical. A critical signal means the relationship appears blocking and is also blocked, overdue, or associated with high risk; it is a decision-support signal rather than a complete critical-path calculation.
- **Delivery forecast** uses Jira resolution dates from the last 42 days to estimate recent weekly throughput and best-case, expected, and worst-case completion dates. The on-time percentage is a transparent heuristic and is omitted when the source history is insufficient.

The app stores at most 20 compact snapshots per release and Confluence-space combination. Snapshots contain issue keys and aggregate delivery metrics only; Confluence bodies, Slack messages, Jira descriptions, and AI narrative content are not stored in release history.

### Risks and Blockers

Lists evidence-backed risks and recommended actions. Each risk may include:

- Severity and whether it is considered a blocker
- A description of the risk and its possible impact
- A recommended action, owner, or decision request when the sources provide one
- Evidence links to the supporting Jira issue, Confluence content, or selected Slack conversation

Use the evidence links to validate the source context. The **Executive decisions** list is generated from risks that require a decision or contain a recommended action; it is not a separate approval system and does not update Jira.

### Meeting Intelligence

Highlights accessible Confluence content that appears to be a meeting artifact, including meeting notes, transcripts, stand-ups, syncs, weekly updates, retrospectives, agendas, planning notes, status updates, and live documents.

Select **Open** to review a source in Confluence. **Captured follow-ups** repeats up to six decision-oriented actions identified by the analysis. If the list is empty, either no matching meeting content was found or no supported follow-up was detected.

### Data Quality

Use this section before sharing or acting on the readout.

- **Jira**, **Confluence**, **Slack**, and **AI analysis** cards show whether each source returned usable data and when it was refreshed.
- **View source lineage** lists the Confluence items included in the readout and links back to them.
- **View Slack source lineage** lists the recent messages supplied to the analysis and links back to their selected conversations.
- **View Jira query** shows the exact JQL used to select release issues.
- **View AI data gaps** lists missing or weak evidence that limited the analysis.

“No data” can mean there were no matching records, the source was inaccessible, or the integration was not configured. Review the card detail and the messages elsewhere on the page for the specific cause.

## Recommended review workflow

1. Confirm the scope and updated time in the header.
2. Scan **Overview** and read the confidence rationale.
3. Review every high-severity risk, blocker, and decision request.
4. Open the cited Jira and Confluence evidence for any material decision.
5. Check **Data Quality** for disconnected sources, an unexpected JQL query, or reported data gaps.
6. Select **Refresh data** immediately before using the dashboard in a release review or status meeting.

## Troubleshooting

### The dashboard shows no Jira issues

- Confirm the fix-version name exactly matches Jira.
- Check that the version contains stories or bugs; other issue types are not included.
- Expand **View Jira query** and verify the generated filter.
- Confirm you can open the relevant Jira issues with your Atlassian account.
- Ask the app administrator whether additional team or JQL filters are configured.

### Confluence shows no data

- Enter the space key rather than the space name.
- Confirm the space exists and you can view its content.
- Check the Confluence source card for an access or retrieval message.
- A successful connection can still return no meeting intelligence if no content resembles meeting notes or transcripts.

### AI analysis is unavailable

Jira and Confluence metrics can still be useful, but confidence, AI risk counts, and the executive readout may be missing. Check the AI source card for the status. Common causes include a missing API configuration, a request timeout, or an invalid service response. Contact the app administrator if the condition persists.

### The page displays “Live data unavailable”

Read the accompanying error, confirm the selected release and space, and try **Refresh data** once. If the error continues, give the administrator the selected release, space key, approximate time, and visible error text.

### The numbers look stale or unexpected

- Select **Refresh data** and confirm the updated time changes.
- Verify the selected fix version and the JQL shown in **Data Quality**.
- Open a sample issue and compare its fix version and status in Jira.
- Remember that status groupings are inferred from status names and may not exactly match a custom Jira workflow.

## Data and limitations

- The dashboard reads Jira issues and Confluence content; it does not edit either product.
- Release scope is limited to stories and bugs returned by the dashboard's JQL, with a maximum of 200 issues per readout.
- The release target date comes from the selected Jira fix version. Missing dates reduce the analysis quality.
- Meeting detection is based on titles and content patterns, so relevant notes may be missed and unrelated pages may occasionally appear.
- AI output can be incomplete or incorrect. Risks are intended to be evidence-backed, but users should always inspect the linked source.
- Results depend on source freshness, field completeness, permissions, app settings, and analysis-service availability.

## Help

When reporting a problem, include:

- The Jira fix version and Confluence space key
- The time shown next to **Updated**
- The source-card states from **Data Quality**
- Any visible error message
- Whether the linked Jira and Confluence sources open for you

For Atlassian platform assistance, see [Atlassian Forge support](https://developer.atlassian.com/platform/forge/get-help/).

## Administrator and developer setup

This section is for the team responsible for deploying the app, not day-to-day dashboard users.

### Requirements

- Node.js and npm
- Atlassian Forge CLI configured for the target site
- Jira and Confluence access on that site
- An OpenAI API key configured in the Forge environment to enable AI analysis

### Build and deploy

From `static/dashboard`:

```shell
npm install
npm run build
```

From the app root:

```shell
npm install
forge lint
forge deploy --non-interactive -e development
forge install --non-interactive --site <site-url> --product confluence --environment development
```

### Configure Slack OAuth

1. Create a Slack app with a bot user and add `channels:history`, `groups:history`, `im:history`, and `mpim:history` under **OAuth & Permissions**.
2. Add `https://id.atlassian.com/outboundAuth/finish` as the Slack app's OAuth redirect URL.
3. Export the Slack app client ID as `SLACK_CLIENT_ID` before running Forge CLI commands so the manifest variable can be resolved.
4. Configure the client secret in Forge with `forge providers configure slack -e development`.
5. Deploy the app, upgrade the Confluence installation, and install the Slack app into the workspace. Invite the Slack bot only to private channels or conversations that should be eligible for release analysis.

The dashboard does not list or search Slack conversations. It calls `conversations.history` only for IDs entered by the user, reads at most 15 recent messages per ID, and includes at most five IDs in one analysis. Slack may apply stricter rate limits to non-Marketplace apps.

Use `forge install --non-interactive --upgrade` after changing app scopes or permissions. Ordinary code-only updates require a new deployment but not an installation upgrade.

The app supports environment-level defaults for `DEFAULT_RELEASE_ID`, `DEFAULT_TEAM`, `CONFLUENCE_SPACE_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, and `OPENAI_API_KEY`. Stored app settings may additionally define `defaultReleaseId`, `defaultTeam`, `defaultConfluenceSpaceKey`, `jiraTeamField`, and `extraJqlClauses`.
