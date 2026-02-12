export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    throw new Error(`API request failed for ${path}`);
  }
  return response;
}

