export async function uploadDocument(source: string, content: string): Promise<string> {
  console.log(`Uploading document from ${source}`);
  return `doc-${Date.now()}`;
}

