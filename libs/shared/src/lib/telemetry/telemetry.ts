import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

export const oTelemetry = async (endpoint: string) => {
    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
            url: `${endpoint}/traces`,
        }),
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
                url: `${endpoint}/metrics`,
                headers: {},
                concurrencyLimit: 1,
            }),
        }),
        instrumentations: [
            getNodeAutoInstrumentations({
                // Pass configuration for specific instrumentations here
                '@opentelemetry/instrumentation-http': {
                    // This is the key: configure the HTTP instrumentation
                    ignoreIncomingRequestHook: (request: any) => {
                        // Return true to ignore the request
                        // This will exclude /api/health/
                        return request.url ? request.url.startsWith('/api/health') : false;
                    },
                },
            }),
        ],
    });

    await sdk.start();
};
