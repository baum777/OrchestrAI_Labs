export function chunkText(lines: string[], chunkSize = 3): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

