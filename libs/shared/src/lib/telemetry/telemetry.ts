import { logs } from '@opentelemetry/api-logs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ConsoleLogRecordExporter, LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

export function createTelemetryResource(
    serviceName: string,
    serviceVersion: string,
    environment: string,
    factory: string,
): any {
    return resourceFromAttributes({
        'service.name': serviceName,
        'service.version': serviceVersion,
        'deployment.environment': environment,
        factory: factory,
    });
}

export const oTelemetry = async (serviceName: string, serviceVersion: string, environment: string, factory: string) => {
    const resource = createTelemetryResource(serviceName, serviceVersion, environment, factory);
    const loggerProvider = new LoggerProvider({ resource });
    loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()));
    loggerProvider.addLogRecordProcessor(
        new SimpleLogRecordProcessor(
            new OTLPLogExporter({
                url: 'http://127.0.0.1:4318/v1/logs',
            }),
        ),
    );
    logs.setGlobalLoggerProvider(loggerProvider);

    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
            url: 'http://127.0.0.1:4318/v1/traces',
        }),
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
                url: 'http://127.0.0.1:4318/v1/metrics',
                headers: {},
                concurrencyLimit: 1,
            }),
        }),
        instrumentations: [getNodeAutoInstrumentations()],
        resource,
    });

    await sdk.start();
    console.log('[Telemetry] OpenTelemetry initialized');
};
