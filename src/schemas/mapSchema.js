import { z } from 'zod';

// Node schema
export const NodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  type: z.enum(['concept', 'entity', 'event', 'location', 'person']).optional(),
  size: z.number().optional(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Edge schema
export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  weight: z.number().optional(),
  type: z.enum(['relationship', 'dependency', 'similarity', 'hierarchy']).optional(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Territory schema
export const TerritorySchema = z.object({
  id: z.string(),
  name: z.string(),
  nodeIds: z.array(z.string()),
  color: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Complete map schema
export const MapSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  territories: z.array(TerritorySchema).optional(),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    created: z.string().optional(),
    tags: z.array(z.string()).optional(),
    version: z.string().optional()
  }).optional()
});

// Request schema
export const LLMRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  context: z.string().optional(),
  provider: z.enum(['openai', 'anthropic']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional()
});

// Response schema
export const LLMResponseSchema = z.object({
  mapJson: MapSchema,
  provider: z.string().optional(),
  model: z.string().optional(),
  usage: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional()
  }).optional()
});

// Validation helper functions
export function validateMap(data) {
  try {
    return {
      success: true,
      data: MapSchema.parse(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors || error.message
    };
  }
}

export function validateRequest(data) {
  try {
    return {
      success: true,
      data: LLMRequestSchema.parse(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors || error.message
    };
  }
}
