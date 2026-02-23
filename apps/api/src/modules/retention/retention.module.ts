import { Module } from '@nestjs/common';
import { RetentionPolicyService } from './retention-policy.service';
import { AuditProofService } from './audit-proof.service';

@Module({
  providers: [RetentionPolicyService, AuditProofService],
  exports: [RetentionPolicyService, AuditProofService],
})
export class RetentionModule {}
