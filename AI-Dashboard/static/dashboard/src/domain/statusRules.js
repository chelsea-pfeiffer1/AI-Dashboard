const EXACT_COMPLETED_STATUSES = new Set(['ready for release', 'abandoned']);

export function normalizedStatus(status) {
  return String(status || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isDoneStatus(status) {
  const normalized = normalizedStatus(status);
  return EXACT_COMPLETED_STATUSES.has(normalized)
    || /done|complete|closed|resolved|released/i.test(normalized);
}

export function isBlockedStatus(status) {
  return /blocked|blocker|impediment/i.test(normalizedStatus(status));
}

export function isActiveStatus(status) {
  return /progress|review|testing|qa|development/i.test(normalizedStatus(status));
}
