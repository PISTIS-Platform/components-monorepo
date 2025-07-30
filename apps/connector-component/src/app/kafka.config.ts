import { registerAs } from '@nestjs/config';

export const KafkaConfig = registerAs('kafka', () => ({
    k8sDevContext: process.env.KAFKA_K8S_DEV_CONTEXT,
    bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS,
    brokersPorts: process.env.KAFKA_BROKERS_PORTS,
    topicPartition: process.env.KAFKA_TOPIC_PARTITION || 1,
    topicReplicas: process.env.KAFKA_TOPIC_REPLICAS || 1,
    topicRetentionMs: process.env.KAFKA_TOPIC_RETENTION_MS || 604800000,
    topicSegmentBytes: process.env.KAFKA_TOPIC_SEGMENT_BYTES || 1073741824,
}));
