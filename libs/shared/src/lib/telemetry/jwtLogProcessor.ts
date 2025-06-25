import { LogRecord, LogRecordProcessor } from '@opentelemetry/sdk-logs';

export class JwtRedactionLogProcessor implements LogRecordProcessor {
    constructor(private readonly nextProcessor: LogRecordProcessor) {}

    // Method called when a log record is generated
    onEmit(logRecord: LogRecord): void {
        // Redaction logic to hide JWTs in otel logs
        if (
            logRecord.severityText === 'verbose' &&
            typeof logRecord.body === 'string' &&
            logRecord.body.startsWith('User JWT: ')
        ) {
            logRecord.body = `User JWT: [REDACTED_OTEL]`;
        }

        // Pass the (potentially modified) log record to the next processor in the pipeline
        this.nextProcessor.onEmit(logRecord);
    }

    // Called when a log record is forced to be processed
    forceFlush(): Promise<void> {
        return this.nextProcessor.forceFlush();
    }

    // Called when the processor is shut down
    shutdown(): Promise<void> {
        return this.nextProcessor.shutdown();
    }
}
