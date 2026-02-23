/**
 * Knowledge Service Tests
 *
 * Validates citation production and contract compliance.
 */

import { Test } from '@nestjs/testing';
import { KnowledgeService } from '../knowledge.service';
import { PG_POOL } from '../../db/db.module';
import { FakeClock } from '../../../../packages/governance-v2/src/runtime/clock';

const mockPool = {
  query: jest.fn(),
};

const mockLogger = {
  append: jest.fn().mockResolvedValue(undefined),
};

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let clock: FakeClock;

  beforeEach(async () => {
    clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    
    const module = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: PG_POOL, useValue: mockPool },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    mockPool.query.mockClear();
    mockLogger.append.mockClear();
  });

  describe('citation production', () => {
    it('should produce citations for decisions', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'dec-123',
          title: 'Test Decision',
          updated_at: '2026-01-01T00:00:00Z',
          searchable_text: 'Test content about testing',
        }],
      });

      const result = await service.search(
        'proj-1',
        'test',
        ['decisions'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1'
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].citation).toBeDefined();
      expect(result.results[0].citation.doc_id).toBe('decision-dec-123');
      expect(result.results[0].citation.chunk_id).toBe('decision-dec-123-chunk-0');
      expect(result.results[0].citation.score).toBeGreaterThan(0);
      expect(result.results[0].citation.score).toBeLessThanOrEqual(1);
      expect(result.results[0].citation.tenant_isolated).toBe(true);
      expect(result.results[0].citation.knowledge_source).toBe('decisions');
      expect(result.results[0].citation.acl_scope).toMatch(/^project:/);
    });

    it('should produce citations for reviews', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          review_id: 'rev-456',
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
          comment: 'Looks good',
          searchable_text: 'approved Looks good',
        }],
      });

      const result = await service.search(
        'proj-1',
        'approved',
        ['reviews'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1'
      );

      expect(result.results[0].citation.doc_id).toBe('review-rev-456');
      expect(result.results[0].citation.knowledge_source).toBe('reviews');
    });

    it('should produce citations for logs', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'log-789',
          action: 'knowledge.search',
          blocked: false,
          reason: null,
          created_at: '2026-01-01T00:00:00Z',
          searchable_text: 'knowledge.search',
        }],
      });

      const result = await service.search(
        'proj-1',
        'search',
        ['logs'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1'
      );

      expect(result.results[0].citation.doc_id).toBe('log-log-789');
      expect(result.results[0].citation.knowledge_source).toBe('logs');
    });

    it('should mark citations_complete as true when all have citations', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.search(
        'proj-1',
        'test',
        ['decisions'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1'
      );

      // Empty results are considered complete
      expect(result.meta.citations_complete).toBe(true);
    });

    it('should produce deterministic scores based on position', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: '1', title: 'First', updated_at: '2026-01-01T00:00:00Z', searchable_text: 'content' },
          { id: '2', title: 'Second', updated_at: '2026-01-01T00:00:00Z', searchable_text: 'content' },
        ],
      });

      const result = await service.search(
        'proj-1',
        'content',
        ['decisions'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1'
      );

      // First result should have higher score
      expect(result.results[0].citation.score).toBeGreaterThan(result.results[1].citation.score);
    });
  });

  describe('tenant isolation', () => {
    it('should include tenant_isolated flag in all citations', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'dec-123',
          title: 'Test',
          updated_at: '2026-01-01T00:00:00Z',
          searchable_text: 'content',
        }],
      });

      const result = await service.search(
        'proj-1',
        'test',
        ['decisions'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1',
        'client-1',
        'tenant-1'
      );

      expect(result.results[0].citation.tenant_isolated).toBe(true);
      expect(result.results[0].citation.acl_scope).toContain('project:');
    });
  });

  describe('audit logging', () => {
    it('should include citations_complete in audit log', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.search(
        'proj-1',
        'test',
        ['decisions'],
        10,
        mockLogger as any,
        'agent-1',
        'user-1'
      );

      expect(mockLogger.append).toHaveBeenCalledWith(
        expect.objectContaining({
          output: expect.objectContaining({
            citations_complete: expect.any(Boolean),
            latency_ms: expect.any(Number),
          }),
        })
      );
    });
  });
});
