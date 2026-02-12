export function createEmbedding(text: string): number[] {
  return text.split("").map((char) => char.charCodeAt(0) / 100);
}

