import { registerAs } from '@nestjs/config';

export const KubernetesConfig = registerAs('k8s', () => ({
    kubeDevContext: process.env.K8S_KUBE_DEV_CONTEXT,
    namespace: process.env.K8S_NAMESPACE || 'default',
    strimziClusterName: process.env.K8S_STRIMZI_CLUSTER_NAME,
    kafkaTopicPartition: process.env.K8S_KAFKA_TOPIC_PARTITION || 1,
    kafkaTopicReplicas: process.env.K8S_KAFKA_TOPIC_REPLICAS || 1,
    kafkaTopicRetentionMs: process.env.K8S_KAFKA_TOPIC_RETENTION_MS || 604800000,
    kafkaTopicSegmentBytes: process.env.K8S_KAFKA_TOPIC_SEGMENT_BYTES || 1073741824,
}));
