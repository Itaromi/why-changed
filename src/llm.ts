import OpenAI from 'openai';
import { FileDiff, fileDiffToString } from './parser.js';

export interface FileExplanation {
  filename: string;
  status: FileDiff['status'];
  explanation: string;
  risks: string;
  summary: string;
}

export interface DiffExplanation {
  files: FileExplanation[];
  globalSummary: string;
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

function buildClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set.\n' +
        'Set it with: export OPENAI_API_KEY=your-key\n' +
        'Or add it to a .env file in your project root.'
    );
  }
  return new OpenAI({ apiKey });
}

export async function explainFile(
  file: FileDiff,
  plan: 'free' | 'pro',
  onChunk?: (chunk: string) => void
): Promise<FileExplanation> {
  const client = buildClient();
  const model = plan === 'pro' ? 'gpt-4o' : 'gpt-4o-mini';
  const diffContent = fileDiffToString(file);

  const userMessage = `File: ${file.filename} (${file.status})
+${file.additions} -${file.deletions} lines changed

\`\`\`diff
${diffContent}
\`\`\``;

  let fullContent = '';

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: userMessage },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    fullContent += delta;
    if (onChunk && delta) onChunk(delta);
  }

  let parsed: { explanation: string; risks: string; summary: string };
  try {
    parsed = JSON.parse(fullContent);
  } catch {
    // Fallback if model returns non-JSON
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
  explanations: FileExplanation[],
  plan: 'free' | 'pro'
): Promise<string> {
  const client = buildClient();
  const model = plan === 'pro' ? 'gpt-4o' : 'gpt-4o-mini';

  const summaryList = explanations
    .map((e) => `- ${e.filename}: ${e.summary}`)
    .join('\n');

  const stream = await client.chat.completions.create({
    model,
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
    stream: true,
    temperature: 0.3,
    max_tokens: 200,
  });

  let result = '';
  for await (const chunk of stream) {
    result += chunk.choices[0]?.delta?.content ?? '';
  }
  return result.trim();
}
