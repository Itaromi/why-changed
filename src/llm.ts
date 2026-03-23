import { Mistral } from '@mistralai/mistralai';
import { FileDiff, fileDiffToString } from './parser.js';

export interface FileExplanation {
  filename: string;
  status: FileDiff['status'];
  explanation: string;
  risks: string;
  summary: string;
}

function getSystemPrompt(): string {
  const langSuffix = process.env._WHY_LANG_SUFFIX ?? '';
  return SYSTEM_PROMPT_BASE + langSuffix;
}

const SYSTEM_PROMPT_BASE = `You are a senior software engineer. Given a git diff, explain in plain language:
1) What changed and why (be specific about logic changes, not just "the code was modified")
2) Potential risks or side effects of these changes
3) A concise one-line summary

Structure your response EXACTLY as JSON with these fields:
{
  "explanation": "what changed and why",
  "risks": "potential risks and side effects",
  "summary": "one-line summary"
}

Be technical, concise, and actionable. If risks are minimal, say so briefly.`;

const MODEL = 'mistral-small-latest';

function buildClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'MISTRAL_API_KEY environment variable is not set.\n' +
        'Set it with: export MISTRAL_API_KEY=your-key\n' +
        'Or add it to a .env file in your project root.'
    );
  }
  return new Mistral({ apiKey });
}

export async function explainFile(
  file: FileDiff,
  onChunk?: (chunk: string) => void
): Promise<FileExplanation> {
  const client = buildClient();
  const diffContent = fileDiffToString(file);

  const userMessage = `File: ${file.filename} (${file.status})
+${file.additions} -${file.deletions} lines changed

\`\`\`diff
${diffContent}
\`\`\``;

  let fullContent = '';

  const stream = await client.chat.stream({
    model: MODEL,
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    maxTokens: 600,
    responseFormat: { type: 'json_object' },
  });

  for await (const event of stream) {
    const delta = event.data.choices[0]?.delta?.content ?? '';
    if (typeof delta === 'string') {
      fullContent += delta;
      if (onChunk && delta) onChunk(delta);
    }
  }

  let parsed: { explanation: string; risks: string; summary: string };
  try {
    parsed = JSON.parse(fullContent);
  } catch {
    parsed = {
      explanation: fullContent,
      risks: 'Unable to parse risks.',
      summary: 'Unable to parse summary.',
    };
  }

  return {
    filename: file.filename,
    status: file.status,
    explanation: parsed.explanation ?? '',
    risks: parsed.risks ?? '',
    summary: parsed.summary ?? '',
  };
}

export async function buildGlobalSummary(
  explanations: FileExplanation[]
): Promise<string> {
  const client = buildClient();

  const summaryList = explanations
    .map((e) => `- ${e.filename}: ${e.summary}`)
    .join('\n');

  const stream = await client.chat.stream({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior software engineer. Write a concise 2-3 sentence overall summary of the following changes. Focus on the overall intent and impact, not individual files.',
      },
      {
        role: 'user',
        content: `Individual file summaries:\n${summaryList}\n\nProvide an overall summary of this changeset.`,
      },
    ],
    temperature: 0.3,
    maxTokens: 200,
  });

  let result = '';
  for await (const event of stream) {
    const delta = event.data.choices[0]?.delta?.content ?? '';
    if (typeof delta === 'string') result += delta;
  }
  return result.trim();
}
