// Best-effort secret redaction before a transcript leaves the machine
// (ARCHITECTURE.md §12: "minimize transcript exposure ... never write secrets
// into decision files"). Pattern matching covering common and modern secret shapes.

const RULES: Array<{ pattern: RegExp; replace: (...match: string[]) => string }> = [
  // 1. PEM Private Keys
  {
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    replace: () => '[REDACTED]',
  },
  // 2. AWS Access Key IDs
  {
    pattern: /\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    replace: () => '[REDACTED]',
  },
  // 3. OpenAI API Keys (classic sk-... and project sk-proj-...)
  {
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
    replace: () => '[REDACTED]',
  },
  // 4. Anthropic API Keys (sk-ant-...)
  {
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    replace: () => '[REDACTED]',
  },
  // 5. GitHub Personal Access & Fine-Grained Tokens
  {
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/g,
    replace: () => '[REDACTED]',
  },
  {
    pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g,
    replace: () => '[REDACTED]',
  },
  // 6. JWT Tokens (header.payload.signature)
  {
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\b/g,
    replace: () => '[REDACTED]',
  },
  // 7. Google API Keys (AIza...)
  {
    pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g,
    replace: () => '[REDACTED]',
  },
  // 8. Slack Tokens (xoxb, xoxp, xoxa, etc.)
  {
    pattern: /\bxox[baprs]-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}\b/g,
    replace: () => '[REDACTED]',
  },
  // 9. Authorization: Bearer tokens
  {
    pattern: /\bBearer\s+[A-Za-z0-9\-_.]{10,}/gi,
    replace: () => '[REDACTED]',
  },
  // 10. Key: value / Key=value secrets
  {
    pattern: /(["']?(?:api[_-]?key|secret|token|password|passwd|pwd|auth|private[_-]?key)["']?\s*[:=]\s*)(["'`]?)([^\s"'`,;]{6,})\2/gi,
    replace: (_match, prefix: string, quote: string) => `${prefix}${quote}[REDACTED]${quote}`,
  },
  // 11. URI Connection string credentials (scheme://user:pass@host)
  {
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
