/**
 * Redacts anything that looks like a credential/secret/token from a
 * free-text summary before it is persisted or published — same defensive
 * sanitization Operations Health / Marketplace Health apply to their own
 * summaries. This module only ever builds summaries from safe, known-shape
 * data (counts, enum tags, module keys), but every text field still passes
 * through this as defense in depth — never a raw provider/payment error
 * message.
 */
export function sanitizeSummary(text: string): string {
  if (!text) {
    return text;
  }

  return text
    .replace(/\b(?:sk|pk|rk)_[a-zA-Z0-9]{8,}\b/g, '[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]{10,}\b/gi, 'Bearer [REDACTED]')
    .replace(/\b[A-Za-z0-9._-]*(?:token|secret|apikey|api_key|password|credential)[A-Za-z0-9._-]*\s*[:=]\s*\S+/gi, (match) => {
      const separatorIndex = match.search(/[:=]/);
      return `${match.slice(0, separatorIndex + 1)} [REDACTED]`;
    })
    .replace(/\beyJ[a-zA-Z0-9._-]{20,}\b/g, '[REDACTED]');
}
