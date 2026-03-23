import { program } from 'commander';
import { createInterface } from 'readline';
import { parseDiff, truncateDiff } from './parser.js';
import { resolvePlan } from './license.js';
import { explainFile, buildGlobalSummary, FileExplanation } from './llm.js';
import {
  printFileExplanation,
  printGlobalSummary,
  printUpgradeBanner,
  printError,
  printInfo,
  writeMarkdown,
  writeHtml,
} from './formatter.js';

const FREE_TIER_LIMIT = 200;

program
  .name('why-changed')
  .description('Explain git diffs in plain language using AI')
  .version('1.0.0')
  .option('--format <type>', 'output format: terminal, md, html', 'terminal')
  .option('--lang <lang>', 'response language (e.g. fr, es, de)', 'en')
  .option('--output <path>', 'output file path (for md/html formats)')
  .option('--no-color', 'disable colored output')
  .addHelpText(
    'after',
    `
Examples:
  git diff HEAD~1 | why-changed
  git diff HEAD~1 | why-changed --format=md
  git diff HEAD~1 | why-changed --format=html --output=report.html
  git diff HEAD~1 | why-changed --lang=fr
`
  );

program.parse(process.argv);

const options = program.opts<{
  format: string;
  lang: string;
  output?: string;
  color: boolean;
}>();

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    printError(
      'No git diff found on stdin.\n\n' +
        '  Usage: git diff HEAD~1 | why-changed\n' +
        '         git diff HEAD~1 HEAD | why-changed --format=md'
    );
    process.exit(1);
  }

  return new Promise((resolve) => {
    const lines: string[] = [];
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolve(lines.join('\n')));
  });
}

function buildSystemPromptSuffix(lang: string): string {
  if (lang === 'en') return '';
  return `\n\nIMPORTANT: Write your entire response in ${lang} language.`;
}

async function main() {
  const rawDiff = await readStdin();

  if (!rawDiff.trim()) {
    printError('The diff is empty — nothing to explain.');
    process.exit(1);
  }

  const parsed = parseDiff(rawDiff);

  if (parsed.files.length === 0) {
    printError('Could not parse any files from the diff.');
    process.exit(1);
  }

  // Resolve plan (free or pro)
  printInfo('Checking license…');
  const plan = await resolvePlan();

  let truncated = false;
  let workingDiff = parsed;

  if (plan === 'free' && parsed.totalLines > FREE_TIER_LIMIT) {
    truncated = true;
    workingDiff = truncateDiff(parsed, FREE_TIER_LIMIT);
    printUpgradeBanner();
  }

  if (options.lang !== 'en') {
    process.env._WHY_LANG_SUFFIX = buildSystemPromptSuffix(options.lang);
  }

  const modelLabel = plan === 'pro' ? 'GPT-4o (Pro)' : 'GPT-4o mini (Free)';
  printInfo(`Analysing ${workingDiff.files.length} file(s) with ${modelLabel}…\n`);

  const explanations: FileExplanation[] = [];

  for (const file of workingDiff.files) {
    process.stdout.write(`\x1b[36m\x1b[1m→ ${file.filename}\x1b[0m `);

    const exp = await explainFile(file, plan);

    // Clear the progress indicator line
    process.stdout.write('\r\x1b[K');

    if (options.format === 'terminal') {
      printFileExplanation(exp);
    }

    explanations.push(exp);
  }

  const globalSummary = await buildGlobalSummary(explanations, plan);

  if (options.format === 'terminal') {
    printGlobalSummary(globalSummary);
    return;
  }

  if (options.format === 'md') {
    const outPath = writeMarkdown(
      explanations,
      globalSummary,
      truncated,
      options.output ?? 'CHANGES.md'
    );
    console.log(`\n✔ Markdown written to ${outPath}`);
    return;
  }

  if (options.format === 'html') {
    const outPath = writeHtml(
      explanations,
      globalSummary,
      truncated,
      options.output ?? 'CHANGES.html'
    );
    console.log(`\n✔ HTML written to ${outPath}`);
    return;
  }

  printError(`Unknown format "${options.format}". Use: terminal, md, html`);
  process.exit(1);
}

main().catch((err: Error) => {
  printError(err.message);
  process.exit(1);
});
