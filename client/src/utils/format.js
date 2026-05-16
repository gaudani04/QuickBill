export function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

export function apiErr(e) {
  const msg = e.response?.data?.message;
  const errs = e.response?.data?.errors;
  if (Array.isArray(errs) && errs.length) {
    const first = errs[0];
    const detail =
      typeof first === "string"
        ? first
        : first?.msg || first?.message || JSON.stringify(first);
    return detail || msg || "Something went wrong";
  }
  return msg || e.message || "Something went wrong";
}
