import { logger } from './Logger';

export interface ExtensionLensReport {
    extensionId: string;
    durationMs: number;
    status: 'success' | 'failure' | 'skipped';
    error?: Error;
}

export class ExtensionLens {
    public trace(extensionId: string, message: string, context?: any) {
        logger.debug(`[${extensionId}] ${message}`, context || '');
    }

    public report(data: ExtensionLensReport) {
        const telemetryEvent = {
            ...data,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        };

        if (data.status === 'failure') {
            logger.error(`[Telemetry] ${data.extensionId} failed in ${data.durationMs.toFixed(2)}ms`);
        } else {
            logger.info(`[Telemetry] ${data.extensionId} ${data.status} in ${data.durationMs.toFixed(2)}ms`);
        }

        logger.telemetry(telemetryEvent);
    }
}
