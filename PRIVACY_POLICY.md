# IdeaGit Beta Privacy Policy

**Effective Date:** August 12, 2026

## 1. Overview
IdeaGit is a local-first, Git-backed decision memory tool for software developers and AI coding agents. Privacy and code confidentiality are foundational to our design.

## 2. What Data Is Collected & Stored

### Local Storage (Default)
- **Decision Records:** Technical decision records are stored strictly on your local machine inside your repository's `.decisions/` directory as plain Markdown files. These files stay within your project repository and are committed to your Git version control.
- **Local Consent & Settings:** Local configuration and opt-in consent settings are saved on your device at `~/.ideagit/consent.json`.

### Experimental Auto-Capture (Opt-In Only)
- If and only if you explicitly enable auto-capture via `ideagit consent`, IdeaGit reads local session transcripts to extract candidate decisions.
- **Secret Redaction:** Before any transcript content is processed for candidate extraction, automated redaction strips known credentials, API keys, tokens, connection strings, and PEM private keys. Candidates containing un-redacted secrets are automatically discarded.
- **No Remote Telemetry:** IdeaGit does not automatically transmit usage metrics, telemetry, or code content to external third-party analytics servers.

## 3. How Data Is Used
All decision data is consumed locally by your designated MCP client (e.g. Claude Code, Cursor, Windsurf) to assist your AI coding agent during development.

## 4. User Rights & Data Deletion
- **Local Data Control:** Because all decision files reside in your Git repository under `.decisions/`, you can modify, anonymize, or delete decision records at any time using standard Git commands or file editors.
- **Revoking Consent:** You can revoke transcript auto-capture consent at any time by running `ideagit consent revoke`.

## 5. Contact & Support
For data privacy inquiries or support during the beta test, please contact the project maintainers via the designated beta feedback channel.
