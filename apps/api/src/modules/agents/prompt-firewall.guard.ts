import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PromptSanitizer } from '@governance/policy/prompt-sanitizer';
import { PromptAuditService } from '@governance/policy/prompt-audit.service';

@Injectable()
export class PromptFirewallGuard implements CanActivate {
  constructor(
    private readonly sanitizer: PromptSanitizer,
    private readonly auditService: PromptAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Extract prompt from various request formats
    const prompt = body.prompt || body.message || body.input || JSON.stringify(body);

    if (!prompt || typeof prompt !== 'string') {
      // No prompt to check, allow
      return true;
    }

    // Run sanitization
    const result = this.sanitizer.sanitize(prompt);

    // Hash for audit (never store raw prompt)
    const promptHash = this.auditService.hashPrompt(prompt);
    const promptPreview = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;

    // Log decision
    await this.auditService.logDecision(
      promptHash,
      promptPreview,
      result.riskScore,
      result.blocked,
      result.reasons,
      request.headers['x-tenant-id'],
      request.user?.id,
    );

    if (result.blocked) {
      throw new ForbiddenException({
        error: 'Prompt blocked by security policy',
        code: 'PROMPT_BLOCKED',
        riskScore: result.riskScore,
        reasons: result.reasons,
      });
    }

    // Replace with sanitized version
    if (body.prompt) body.prompt = result.sanitized;
    if (body.message) body.message = result.sanitized;
    if (body.input) body.input = result.sanitized;

    return true;
  }
}
