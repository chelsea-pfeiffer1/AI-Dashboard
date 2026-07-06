// src/components/layout/DashboardShell.jsx
import React from 'react';
import { defaultSectionOrder, sectionRegistry } from '../../templates/sectionRegistry';

export default function DashboardShell({ dashboard, preferences }) {
  const order = preferences.sectionOrder || defaultSectionOrder;
  const visible = new Set(preferences.visibleSections || []);

  return (
    <>
      {order.map((sectionId) => {
        if (!visible.has(sectionId)) return null;

        const section = sectionRegistry[sectionId];
        if (!section) return null;

        const SectionComponent = section.component;

        return (
          <SectionComponent
            key={sectionId}
            dashboard={dashboard}
            preferences={preferences}
          />
        );
      })}
    </>
  );
}