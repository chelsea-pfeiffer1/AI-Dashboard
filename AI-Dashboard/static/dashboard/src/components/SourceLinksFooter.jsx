import React from 'react';

export default function SourceLinksFooter({ links }) {
  const jira = links?.jira;
  const confluence = links?.confluence;

  return (
    <footer
      style={{
        marginTop: 28,
        padding: '16px 0 8px',
        borderTop: '1px solid rgba(148, 163, 184, 0.18)',
        color: '#94a3b8',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div style={{ marginBottom: 8, color: '#cbd5e1', fontWeight: 600 }}>Source Links</div>
      <div>
        Jira: {jira?.endpoint || 'Not available'} | JQL: {jira?.jql || 'Not available'} | Refreshed:{' '}
        {jira?.lastRefresh || 'Not available'}
      </div>
      <div>
        Confluence: {confluence?.endpoint || 'Not available'} | CQL: {confluence?.cql || 'Not available'} | Refreshed:{' '}
        {confluence?.lastRefresh || 'Not available'}
      </div>
    </footer>
  );
}