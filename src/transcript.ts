// Parses a Claude Code .jsonl session transcript into plain user/assistant
// text, dropping tool_use/tool_result payload noise. Feeds src/extract.ts.

import { readFile } from 'node:fs/promises';

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
}

interface TranscriptEntry {
  type?: string;
  message?: { content?: string | ContentBlock[] };
}

function textOf(content: string | ContentBlock[] | undefined): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n');
}

export async function readTranscriptText(transcriptPath: string): Promise<string> {
  const raw = await readFile(transcriptPath, 'utf8');
  const turns: string[] = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    const text = textOf(entry.message?.content).trim();
    if (!text) continue;
    turns.push(`### ${entry.type.toUpperCase()}\n${text}`);
  }

  return turns.join('\n\n');
}
