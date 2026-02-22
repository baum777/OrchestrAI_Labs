/**
 * Governance Artifact Storage
 * 
 * Phase 2A: Vercel Blob with filesystem fallback
 * Supports versioned artifacts for drift timeline (Phase 2)
 * 
 * Storage hierarchy:
 * - latest: governance-status/latest.json
 * - versioned: governance-status/<commit-sha>.json
 * 
 * Security:
 * - No secrets logged
 * - No PII exposure
 * - Deterministic reads
 * - Server-only (tokens never exposed to client)
 */

import { readFile } from "fs/promises";

const BLOB_BASE_PATH = "governance-status";
const LATEST_FILE = "latest.json";

export interface StorageResult {
  data: unknown | null;
  error: string | null;
}

/**
 * Get Vercel Blob API URL for a specific path
 * Uses REST API directly to avoid large SDK dependency
 */
function getBlobUrl(path: string): string {
  const storeId = process.env.BLOB_STORE_ID;
  if (!storeId) {
    throw new Error("BLOB_STORE_ID not configured");
  }
  return `https://${storeId}.public.blob.vercel-storage.com/${path}`;
}

/**
 * Fetch from Vercel Blob with authentication
 */
async function fetchFromBlob(path: string): Promise<Response> {
  const token = process.env.VERCEL_BLOB_TOKEN;
  if (!token) {
    throw new Error("VERCEL_BLOB_TOKEN not configured");
  }

  const url = getBlobUrl(path);
  
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Check if Vercel Blob is configured
 */
function isBlobConfigured(): boolean {
  return !!(process.env.VERCEL_BLOB_TOKEN && process.env.BLOB_STORE_ID);
}

/**
 * Load artifact from filesystem (local dev fallback)
 */
async function loadFromFilesystem(filename: string): Promise<StorageResult> {
  const basePath = process.env.GOVERNANCE_ARTIFACT_PATH ?? "/governance-status";
  const filepath = `${basePath}/${filename}`;
  
  try {
    console.log("[GovernanceStorage] Loading from filesystem...");
    const raw = await readFile(filepath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    console.log("[GovernanceStorage] Filesystem load successful");
    return { data, error: null };
  } catch (err) {
    const errorType = err instanceof Error ? err.constructor.name : "UnknownError";
    console.error(`[GovernanceStorage] Filesystem failed: ${errorType}`);
    return { data: null, error: "Artifact not available" };
  }
}

/**
 * Load artifact from Vercel Blob
 */
async function loadFromBlob(path: string): Promise<StorageResult> {
  try {
    console.log("[GovernanceStorage] Loading from Vercel Blob...");
    const res = await fetchFromBlob(path);
    
    if (!res.ok) {
      if (res.status === 404) {
        return { data: null, error: "Artifact not found" };
      }
      return { data: null, error: `Blob storage error: ${res.status}` };
    }
    
    const raw = await res.text();
    const data = JSON.parse(raw) as unknown;
    console.log("[GovernanceStorage] Blob load successful");
    return { data, error: null };
  } catch (err) {
    const errorType = err instanceof Error ? err.constructor.name : "UnknownError";
    console.error(`[GovernanceStorage] Blob failed: ${errorType}`);
    return { data: null, error: "Artifact not available" };
  }
}

/**
 * Load latest governance artifact.
 * 
 * Priority:
 * 1) Vercel Blob (if configured)
 * 2) Filesystem fallback (local dev)
 * 
 * TODO: Add additional providers:
 *   - S3: await s3.send(new GetObjectCommand({...}))
 *   - Railway Volume: Same approach as filesystem
 *   - Internal artifact service: await fetch(process.env.ARTIFACT_SERVICE_URL)
 */
export async function loadLatestArtifact(): Promise<StorageResult> {
  if (isBlobConfigured()) {
    const result = await loadFromBlob(`${BLOB_BASE_PATH}/${LATEST_FILE}`);
    // Only return blob result if successful, otherwise try filesystem
    if (result.data !== null) {
      return result;
    }
    console.log("[GovernanceStorage] Blob failed, trying filesystem fallback");
  }
  
  return loadFromFilesystem(LATEST_FILE);
}

/**
 * Load specific artifact version by commit SHA.
 * Enables Phase-2 drift timeline feature.
 * 
 * @param commit - Full or short commit SHA (e.g., "abc1234")
 * @returns StorageResult with artifact data or error
 * 
 * TODO: Add pagination/listing for timeline navigation:
 *   - Vercel Blob: list() with prefix
 *   - S3: ListObjectsV2 with Prefix
 */
export async function loadArtifactByCommit(commit: string): Promise<StorageResult> {
  const sanitizedCommit = commit.replace(/[^a-f0-9]/gi, "").slice(0, 40);
  
  if (sanitizedCommit.length < 7) {
    return { data: null, error: "Invalid commit SHA" };
  }
  
  const filename = `${sanitizedCommit}.json`;
  
  if (isBlobConfigured()) {
    const result = await loadFromBlob(`${BLOB_BASE_PATH}/${filename}`);
    if (result.data !== null) {
      return result;
    }
  }
  
  return loadFromFilesystem(filename);
}

/**
 * List available artifact versions (Phase-2 timeline preparation).
 * 
 * TODO: Implement for drift timeline UI:
 *   - Vercel Blob: await list({ prefix: 'governance-status/' })
 *   - S3: await s3.send(new ListObjectsV2Command({...}))
 *   - Returns: array of { commit, timestamp, path }
 */
export async function listArtifacts(): Promise<{ commit: string; path: string }[]> {
  // Phase-2: Implement when timeline UI is needed
  console.log("[GovernanceStorage] listArtifacts not yet implemented");
  return [];
}
