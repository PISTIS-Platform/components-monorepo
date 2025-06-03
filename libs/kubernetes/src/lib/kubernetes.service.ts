import { CoreV1Api, CustomObjectsApi, KubeConfig, V1Secret } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StrimziAcl } from './kubernetes.interface';

const STRIMZI_API_GROUP = 'kafka.strimzi.io';
const STRIMZI_API_VERSION = 'v1beta2';
const KAFKA_TOPIC_PLURAL = 'kafkatopics';
const KAFKA_USER_PLURAL = 'kafkausers';

@Injectable()
export class KubernetesService {
    private readonly logger = new Logger(KubernetesService.name);
    private readonly coreApi: CoreV1Api;
    private readonly customObjectsApi: CustomObjectsApi;

    constructor(private readonly config: ConfigService) {
        const kc = new KubeConfig();
        const kubeDevContext = this.config.get<string>('k8s.kubeDevContext');

        if (kubeDevContext) {
            kc.loadFromDefault();
            kc.setCurrentContext(kubeDevContext);
        } else {
            // Connect to the cluster using the default kubeconfig
            kc.loadFromCluster();
        }

        this.coreApi = kc.makeApiClient(CoreV1Api);
        this.customObjectsApi = kc.makeApiClient(CustomObjectsApi);
        this.logger.log('Kubernetes API initialized');
    }

    /**
     * Create a Kafka topic in the Kubernetes cluster.
     * @param name The name of the Kafka topic to create.
     * @param namespace The namespace in which to create the Kafka topic. Defaults to 'default' if not provided.
     */
    async createKafkaTopic(
        name: string,
        namespace: string = this.config.get('k8s.namespace') ?? 'default',
    ): Promise<void> {
        this.logger.debug(`Creating Kafka topic with name: ${name}`);

        const kafkaTopicManifest = {
            apiVersion: `${STRIMZI_API_GROUP}/${STRIMZI_API_VERSION}`,
            kind: 'KafkaTopic',
            metadata: {
                name,
                namespace: namespace,
                labels: {
                    'strimzi.io/cluster': this.config.get<string>('k8s.strimziClusterName'),
                },
            },
            spec: {
                partitions: this.config.get<number>('k8s.kafkaTopicPartition'),
                replicas: this.config.get<number>('k8s.kafkaTopicReplicas'),
                config: {
                    'retention.ms': this.config.get<number>('k8s.kafkaTopicRetentionMs'),
                    'segment.bytes': this.config.get<number>('k8s.kafkaTopicSegmentBytes'),
                },
            },
        };

        await this.customObjectsApi.createNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            KAFKA_TOPIC_PLURAL,
            kafkaTopicManifest,
        );
    }

    /**
     * Delete a Kafka topic from the Kubernetes cluster.
     * @param name The name of the Kafka topic to delete.
     * @param namespace The namespace from which to delete the Kafka topic. Defaults to 'default' if not provided.
     */
    async deleteKafkaTopic(
        name: string,
        namespace: string = this.config.get('k8s.namespace') ?? 'default',
    ): Promise<void> {
        this.logger.debug(`Deleting Kafka topic with name: ${name}`);
        await this.customObjectsApi.deleteNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            KAFKA_TOPIC_PLURAL,
            name,
        );
    }

    /**
     * Create a Kafka user in the Kubernetes cluster.
     * @param name The name of the Kafka user to create.
     * @param password The password for the Kafka user.
     * @param acls The ACLs to assign to the Kafka user.
     * @param namespace The namespace in which to create the Kafka user. Defaults to 'default' if not provided.
     */
    async createKafkaUser(
        name: string,
        password: string,
        acls: StrimziAcl[],
        namespace: string = this.config.get('k8s.namespace') ?? 'default',
    ): Promise<void> {
        this.logger.debug(`Creating Kafka user with name: ${name}`);

        const secretManifest: V1Secret = {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name,
                namespace,
            },
            type: 'Opaque',
            data: {
                password: Buffer.from(password).toString('base64'),
            },
        };

        await this.coreApi.createNamespacedSecret(namespace, secretManifest);

        const kafkaUserManifest = {
            apiVersion: `${STRIMZI_API_GROUP}/${STRIMZI_API_VERSION}`,
            kind: 'KafkaUser',
            metadata: {
                name,
                namespace,
                labels: {
                    'strimzi.io/cluster': this.config.get<string>('k8s.strimziClusterName'),
                },
            },
            spec: {
                authentication: {
                    type: 'scram-sha-512',
                    password: {
                        valueFrom: {
                            secretKeyRef: {
                                name,
                                key: 'password',
                            },
                        },
                    },
                },
                authorization: { type: 'simple', acls },
            },
        };

        await this.customObjectsApi.createNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            KAFKA_USER_PLURAL,
            kafkaUserManifest,
        );
    }

    /**
     * Delete a Kafka user from the Kubernetes cluster.
     * @param name The name of the Kafka user to delete.
     * @param namespace The namespace from which to delete the Kafka user. Defaults to 'default' if not provided.
     */
    async deleteKafkaUser(
        name: string,
        namespace: string = this.config.get<string>('k8s.namespace') ?? 'default',
    ): Promise<void> {
        this.logger.debug(`Deleting Kafka user with name: ${name}`);

        await this.customObjectsApi.deleteNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            KAFKA_USER_PLURAL,
            name,
        );
    }
}
