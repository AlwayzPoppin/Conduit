import { z } from 'zod';

export const AgentIntentSchema = z.object({
    intent: z.string(),
    status: z.string(),
    lastUpdate: z.string().datetime()
});

export const ContributionSchema = z.object({
    timestamp: z.string().datetime(),
    agent: z.string(),
    action: z.string(),
    files: z.array(z.string())
});

export const HandoffSchema = z.object({
    timestamp: z.string().datetime(),
    from: z.string(),
    to: z.string(),
    suggestion: z.string()
});

export const PlanSchema = z.object({
    id: z.string().uuid().optional(),
    task: z.string(),
    assignee: z.string(),
    status: z.enum(['pending', 'in-progress', 'completed', 'failed']),
    timestamp: z.string().datetime()
});

export const ContextSchema = z.object({
    version: z.string(),
    workspace: z.string(),
    agentIntents: z.record(AgentIntentSchema),
    contributions: z.array(ContributionSchema),
    handoffs: z.array(HandoffSchema),
    plans: z.array(PlanSchema),
    recentEvents: z.string().optional(),
    preferences: z.record(z.any()).optional()
});

export type AgentIntent = z.infer<typeof AgentIntentSchema>;
export type Contribution = z.infer<typeof ContributionSchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type ContextState = z.infer<typeof ContextSchema>;
