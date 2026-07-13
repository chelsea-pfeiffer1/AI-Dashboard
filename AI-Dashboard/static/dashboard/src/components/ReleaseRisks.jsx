import React from 'react';

export default function ReleaseRisks({ dashboard }) {
  const records =
    Array.isArray(dashboard?.cardData?.releaseRisks?.records) && dashboard.cardData.releaseRisks.records.length > 0
      ? dashboard.cardData.releaseRisks.records
      : Array.isArray(dashboard?.records)
      ? dashboard.records
      : [];
  const risks = records.filter((record) => record?.risk?.label === 'high').slice(0, 8);

  return (
    <section
      style={{
        marginBottom: 24,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.72)',
        padding: 18,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>
        Release Risks
      </div>

      {risks.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>No high-risk issues were flagged in the current dataset.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {risks.map((record) => (
            <div
              key={record.issueKey}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(30, 41, 59, 0.8)',
              }}
            >
              <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                {record.issueKey}: {record.summary}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 14, marginTop: 4 }}>
                Owner: {record.owner} | Status: {record.status} | Confidence: {record.confidence?.label || 'unknown'}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}