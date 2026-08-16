// Best-effort secret redaction before a transcript leaves the machine
// (ARCHITECTURE.md §12: "minimize transcript exposure ... never write secrets
// into decision files"). Pattern matching, not a secret scanner — it catches
// the common, obvious shapes and nothing else.
//
// ideagit: regex-based redaction, not a real secret scanner; swap for a
// dedicated tool (e.g. detect-secrets) if false negatives show up in review.

const RULES: Array<{ pattern: RegExp; replace: (...match: string[]) => string }> = [
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replace: () => '[REDACTED]',
  },
  { pattern: /AKIA[0-9A-Z]{16}/g, replace: () => '[REDACTED]' }, // AWS access key id
  { pattern: /\bBearer\s+[A-Za-z0-9\-_.]{10,}/gi, replace: () => '[REDACTED]' },
  {
    // key: value / key=value, where key looks secret-shaped. Keeps the key
    // and quoting, redacts only the value.
    pattern: /(["']?(?:api[_-]?key|secret|token|password|passwd|pwd)["']?\s*[:=]\s*)(["'`]?)([^\s"'`,;]{6,})\2/gi,
    replace: (_match, prefix: string, quote: string) => `${prefix}${quote}[REDACTED]${quote}`,
  },
  {
    // scheme://user:pass@host — drop the whole credential, not just the password.
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/:@]+@/gi,
    replace: () => '[REDACTED]@',
  },
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const { pattern, replace } of RULES) {
    out = out.replace(pattern, replace as (...args: string[]) => string);
  }
  return out;
}

export function containsSecret(text: string): boolean {
  return redactSecrets(text) !== text;
}
