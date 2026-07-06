import React from 'react';

function FieldLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#94a3b8',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Select({ value, onChange, options, disabled, ariaLabel }) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      style={{
        width: '100%',
        minHeight: 40,
        borderRadius: 10,
        border: '1px solid rgba(148, 163, 184, 0.25)',
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '0 12px',
        outline: 'none',
      }}
    >
      {options.map((option) => {
        const id = typeof option === 'string' ? option : option.id;
        const name = typeof option === 'string' ? option : option.name;
        return (
          <option key={id || name} value={id}>
            {name}
          </option>
        );
      })}
    </select>
  );
}

export default function DashboardFilters({
  config,
  updateConfig,
  resetConfig,
  refresh,
  releaseOptions = [],
  teamOptions = [],
  viewOptions = [],
  dashboard,
}) {
  const handleApply = () => {
    refresh(config);
  };

  const handleReset = () => {
    resetConfig();
    refresh({
      releaseId: '',
      team: '',
      view: 'Executive',
    });
  };

  return (
    <section
      style={{
        marginBottom: 24,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 16,
        background: 'rgba(15, 23, 42, 0.72)',
        padding: 16,
        boxShadow: '0 16px 30px rgba(15, 23, 42, 0.24)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
            Filters
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Live source: Jira{dashboard?.sourceLinks?.confluence ? ' and Confluence' : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              minHeight: 40,
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'transparent',
              color: '#e2e8f0',
              padding: '0 14px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              minHeight: 40,
              borderRadius: 10,
              border: '1px solid rgba(59, 130, 246, 0.5)',
              background: '#2563eb',
              color: '#fff',
              padding: '0 16px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            style={{
              minHeight: 40,
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: '#111827',
              color: '#e2e8f0',
              padding: '0 14px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div>
          <FieldLabel>Release</FieldLabel>
          <Select
            ariaLabel="Release"
            value={config.releaseId}
            onChange={(value) => updateConfig({ releaseId: value })}
            options={releaseOptions}
            disabled={releaseOptions.length === 0}
          />
        </div>

        <div>
          <FieldLabel>Team</FieldLabel>
          <Select
            ariaLabel="Team"
            value={config.team}
            onChange={(value) => updateConfig({ team: value })}
            options={teamOptions}
            disabled={teamOptions.length === 0}
          />
        </div>

        <div>
          <FieldLabel>View</FieldLabel>
          <Select
            ariaLabel="View"
            value={config.view}
            onChange={(value) => updateConfig({ view: value })}
            options={viewOptions}
            disabled={viewOptions.length === 0}
          />
        </div>
      </div>
    </section>
  );
}