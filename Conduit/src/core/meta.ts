import { z } from 'zod';

// Define the schema for NexGen-Meta configuration
export const MetaSchema = z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    environment: z.enum(['development', 'staging', 'production']),
    routingRules: z.array(z.object({
        extensionId: z.string(),
        priority: z.number().min(1).max(10),
        timeoutMs: z.number().default(5000),
    })),
});

export type NexGenMetadata = z.infer<typeof MetaSchema>;
