export interface FileDiff {
  filename: string;
  oldFilename?: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  lines: string[];
  additions: number;
  deletions: number;
}

export interface ParsedDiff {
  files: FileDiff[];
  totalLines: number;
}

export function parseDiff(raw: string): ParsedDiff {
  const files: FileDiff[] = [];
  const fileBlocks = raw.split(/^(?=diff --git )/m).filter(Boolean);

  for (const block of fileBlocks) {
    const lines = block.split('\n');
    const headerLine = lines[0];

    const match = headerLine.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (!match) continue;

    const aFile = match[1];
    const bFile = match[2];

    let status: FileDiff['status'] = 'modified';
    let filename = bFile;
    let oldFilename: string | undefined;

    const newFileLine = lines.find((l) => l.startsWith('new file mode'));
    const deletedFileLine = lines.find((l) => l.startsWith('deleted file mode'));
    const renameLine = lines.find((l) => l.startsWith('rename from '));

    if (newFileLine) {
      status = 'added';
    } else if (deletedFileLine) {
      status = 'deleted';
      filename = aFile;
    } else if (renameLine) {
      status = 'renamed';
      oldFilename = aFile;
    }

    const diffLines = lines.filter(
      (l) =>
        l.startsWith('+') ||
        l.startsWith('-') ||
        l.startsWith(' ') ||
        l.startsWith('@@')
    );

    const additions = diffLines.filter(
      (l) => l.startsWith('+') && !l.startsWith('+++')
    ).length;
    const deletions = diffLines.filter(
      (l) => l.startsWith('-') && !l.startsWith('---')
    ).length;

    files.push({
      filename,
      oldFilename,
      status,
      lines: lines,
      additions,
      deletions,
    });
  }

  const totalLines = files.reduce(
    (sum, f) => sum + f.additions + f.deletions,
    0
  );

  return { files, totalLines };
}

export function truncateDiff(parsed: ParsedDiff, maxLines: number): ParsedDiff {
  let remaining = maxLines;
  const truncatedFiles: FileDiff[] = [];

  for (const file of parsed.files) {
    const fileChangedLines = file.additions + file.deletions;

    if (remaining <= 0) break;

    if (fileChangedLines <= remaining) {
      truncatedFiles.push(file);
      remaining -= fileChangedLines;
    } else {
      // Partial truncation of the file diff
      let kept = 0;
      const keptLines: string[] = [];

      for (const line of file.lines) {
        const isChange =
          (line.startsWith('+') && !line.startsWith('+++')) ||
          (line.startsWith('-') && !line.startsWith('---'));

        if (isChange) {
          if (kept >= remaining) break;
          kept++;
        }
        keptLines.push(line);
      }

      const additions = keptLines.filter(
        (l) => l.startsWith('+') && !l.startsWith('+++')
      ).length;
      const deletions = keptLines.filter(
        (l) => l.startsWith('-') && !l.startsWith('---')
      ).length;

      truncatedFiles.push({
        ...file,
        lines: keptLines,
        additions,
        deletions,
      });
      remaining = 0;
    }
  }

  return {
    files: truncatedFiles,
    totalLines: truncatedFiles.reduce(
      (sum, f) => sum + f.additions + f.deletions,
      0
    ),
  };
}

export function fileDiffToString(file: FileDiff): string {
  return file.lines.join('\n');
}
