const EXACT_COMPLETED_STATUSES = new Set(['ready for release', 'abandoned']);

function normalizedStatus(status) {
  return String(status || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isDoneStatus(status) {
  const normalized = normalizedStatus(status);
  return EXACT_COMPLETED_STATUSES.has(normalized)
    || /done|complete|closed|resolved|released/i.test(normalized);
}

function isBlockedStatus(status) {
  return /blocked|blocker|impediment/i.test(normalizedStatus(status));
}

function isActiveStatus(status) {
  return /progress|review|testing|qa|development/i.test(normalizedStatus(status));
}

module.exports = { isActiveStatus, isBlockedStatus, isDoneStatus, normalizedStatus };
