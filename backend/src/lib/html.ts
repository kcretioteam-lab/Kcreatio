// Escape a value for HTML text or a quoted attribute. Use for anything user-controlled that goes into
// an email or HTML page — brand names, business names, invoice numbers, user-agent strings, links.
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
