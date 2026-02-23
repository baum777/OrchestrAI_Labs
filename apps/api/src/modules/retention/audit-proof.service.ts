import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';

export interface AuditProofInput {
  category: string;
  recordIds: string[];
  dateRangeStart: Date;
  dateRangeEnd: Date;
  policyVersion: string;
  dryRun: boolean;
  archiveLocation?: string;
}

export interface AuditProof {
  batchChecksum: string;
  verificationHash: string;
  recordCount: number;
}

@Injectable()
export class AuditProofService {
  private readonly algorithm = 'sha256';

  /**
   * Generate cryptographic proof for a retention batch
   */
  generateProof(input: AuditProofInput): AuditProof {
    // Sort IDs for deterministic hashing
    const sortedIds = [...input.recordIds].sort();
    const recordCount = sortedIds.length;

    // Create batch checksum (SHA-256 of sorted IDs)
    const hash = createHash(this.algorithm);
    for (const id of sortedIds) {
      hash.update(id);
    }
    const batchChecksum = hash.digest('hex');

    // Create verification hash (optional HMAC)
    let verificationHash = batchChecksum;
    const hmacSecret = process.env.RETENTION_HMAC_SECRET;
    if (hmacSecret) {
      const hmac = createHmac(this.algorithm, hmacSecret);
      hmac.update(batchChecksum);
      hmac.update(input.category);
      hmac.update(input.dateRangeStart.toISOString());
      hmac.update(input.dateRangeEnd.toISOString());
      hmac.update(input.policyVersion);
      hmac.update(String(input.dryRun));
      verificationHash = hmac.digest('hex');
    }

    return {
      batchChecksum,
      verificationHash,
      recordCount,
    };
  }
}
