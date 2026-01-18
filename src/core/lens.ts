export interface ExtensionLensReport {
    extensionId: string;
    durationMs: number;
    status: 'success' | 'failure' | 'skipped';
    error?: Error;
}

export class ExtensionLens {
    public trace(extensionId: string, message: string, context?: any) {
        console.log(`[Lens][${extensionId}] ${message}`, context || '');
    }

    public report(data: ExtensionLensReport) {
        // In production, this would push to Prometheus/Grafana or an ELK stack
        if (data.status === 'failure') {
            console.error(`[Lens] Alert: ${data.extensionId} failed in ${data.durationMs.toFixed(2)}ms`);
        } else {
            console.log(`[Lens] Report: ${data.extensionId} ${data.status} in ${data.durationMs.toFixed(2)}ms`);
        }
    }
}
