/** Parse YYYY-MM-DD (or ISO) into local start/end of day for MongoDB createdAt filters. */
export function parseDateRangeQuery(query) {
  const now = new Date();
  const defaultTo = endOfDay(now);
  const defaultFrom = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const fromRaw = query.from;
  const toRaw = query.to;

  let from = fromRaw ? startOfDay(parseDateInput(fromRaw)) : defaultFrom;
  let to = toRaw ? endOfDay(parseDateInput(toRaw)) : defaultTo;

  if (Number.isNaN(from.getTime())) {
    throw Object.assign(new Error("Invalid from date"), { status: 400 });
  }
  if (Number.isNaN(to.getTime())) {
    throw Object.assign(new Error("Invalid to date"), { status: 400 });
  }
  if (from > to) {
    throw Object.assign(new Error("'from' must be on or before 'to'"), { status: 400 });
  }

  return { from, to };
}

function parseDateInput(value) {
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function formatDateLabel(d) {
  return d.toISOString().slice(0, 10);
}
