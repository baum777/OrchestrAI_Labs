/**
 * Workstream Schema Definition
 * 
 * JSON Schema for workstream validation
 */

export const workstreamSchema = {
  type: 'object',
  required: ['id', 'owner', 'scope', 'autonomyTier', 'layer', 'structuralModel', 'risks', 'definitionOfDone'],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
    },
    owner: {
      type: 'string',
      minLength: 1,
    },
    scope: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'string',
      },
    },
    autonomyTier: {
      type: 'integer',
      enum: [1, 2, 3, 4],
    },
    layer: {
      type: 'string',
      enum: ['strategy', 'architecture', 'implementation', 'governance'],
    },
    structuralModel: {
      type: 'string',
      minLength: 1,
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'description', 'impact', 'mitigation'],
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          impact: { type: 'string', enum: ['low', 'medium', 'high'] },
          mitigation: { type: 'string' },
          owner: { type: 'string' },
        },
      },
    },
    definitionOfDone: {
      type: 'string',
      minLength: 1,
    },
    status: {
      type: 'string',
      enum: ['todo', 'in_progress', 'blocked', 'in_review', 'done'],
    },
    blockers: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

