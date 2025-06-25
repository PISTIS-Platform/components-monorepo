import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { logs, NodeSDK } from '@opentelemetry/sdk-node';

import { JwtRedactionLogProcessor } from './jwtLogProcessor';

export const oTelemetry = async () => {
    // Create the exporter
    const otlpLogExporter = new OTLPLogExporter();

    // Create the batch processor, giving it the exporter
    const batchLogProcessor = new logs.BatchLogRecordProcessor(otlpLogExporter);

    // Create your custom redaction processor, giving it the batch processor as its 'next'
    const jwtRedactingProcessor = new JwtRedactionLogProcessor(batchLogProcessor);

    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter(),
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter(),
        }),
        logRecordProcessor: jwtRedactingProcessor,
        instrumentations: [getNodeAutoInstrumentations()],
    });

    await sdk.start();

    process.on('SIGTERM', () => {
        sdk.shutdown()
            .then(() => console.log('Telemetry terminated'))
            .catch((error) => console.log('Error terminating telemetry', error))
            .finally(() => process.exit(0));
    });
};
