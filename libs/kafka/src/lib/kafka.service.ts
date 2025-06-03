import { CoreV1Api, CustomObjectsApi, KubeConfig, V1Secret } from '@kubernetes/client-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage } from 'http';

import { StrimziAcl } from './kafka.interface';
import { generatePassword } from './kafka.utils';

const STRIMZI_API_GROUP = 'kafka.strimzi.io';
const STRIMZI_API_VERSION = 'v1beta2';
const STRIMZI_API = `${STRIMZI_API_GROUP}/${STRIMZI_API_VERSION}`;

const KAFKA_NAMESPACE = 'default';
const KAFKA_STRIMZI_CLUSTER_NAME = 'kafka-cluster';
const KAFKA_TOPIC_PLURAL = 'kafkatopics';
const KAFKA_USER_PLURAL = 'kafkausers';

@Injectable()
export class KafkaService {
    private readonly logger = new Logger(KafkaService.name);
    private readonly coreApi: CoreV1Api;
    private readonly customObjectsApi: CustomObjectsApi;

    constructor(private readonly config: ConfigService) {
        const kc = new KubeConfig();
        const kubeDevContext = this.config.get<string>('kafka.k8sDevContext');

        if (kubeDevContext) {
            kc.loadFromDefault();
            kc.setCurrentContext(kubeDevContext);
        } else {
            // Connect to the cluster using the default kubeconfig
            kc.loadFromCluster();
        }

        try {
            this.coreApi = kc.makeApiClient(CoreV1Api);
            this.customObjectsApi = kc.makeApiClient(CustomObjectsApi);
            this.logger.log('Kubernetes API initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Kubernetes API', error);
            throw new Error('Kubernetes API initialization failed');
        }
    }

    /**
     * Create a Kafka topic in the Kubernetes cluster
     * @param id The unique identifier for the Kafka topic
     * @returns The name of the created Kafka topic
     */
    async createTopic(id: string): Promise<string> {
        const name = `ds-${id}`;
        this.logger.debug(`Creating Kafka topic "${name}"`);

        const kafkaTopicManifest = {
            apiVersion: STRIMZI_API,
            kind: 'KafkaTopic',
            metadata: {
                name,
                namespace: KAFKA_NAMESPACE,
                labels: {
                    'strimzi.io/cluster': KAFKA_STRIMZI_CLUSTER_NAME,
                },
            },
            spec: {
                partitions: this.config.get<number>('kafka.topicPartition'),
                replicas: this.config.get<number>('kafka.topicReplicas'),
                config: {
                    'retention.ms': this.config.get<number>('kafka.topicRetentionMs'),
                    'segment.bytes': this.config.get<number>('kafka.topicSegmentBytes'),
                },
            },
        };

        await this.customObjectsApi.createNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_TOPIC_PLURAL,
            kafkaTopicManifest,
        );
        return name;
    }

    /**
     * Delete a Kafka topic from the Kubernetes cluster
     * @param id The unique identifier for the Kafka topic
     */
    async deleteTopic(id: string): Promise<void> {
        const name = `ds-${id}`;
        this.logger.debug(`Deleting Kafka topic "${name}"`);

        await this.customObjectsApi.deleteNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_TOPIC_PLURAL,
            name,
        );
    }

    /**
     * Create a Kafka user in the Kubernetes cluster
     * @param id The unique identifier for the Kafka user
     * @param acls The ACLs to assign to the Kafka user
     * @returns The name and secret of the created Kafka user
     */
    async createKafkaUser(id: string, acls: StrimziAcl[]): Promise<{ name: string; secret: string }> {
        const name = `kuser-${id}`;
        this.logger.debug(`Creating Kafka user with name: ${name}`);

        const secret = generatePassword(32);
        console.log(secret);

        const secretManifest: V1Secret = {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name,
                namespace: KAFKA_NAMESPACE,
            },
            type: 'Opaque',
            data: {
                password: Buffer.from(secret).toString('base64'),
            },
        };

        await this.coreApi.createNamespacedSecret(KAFKA_NAMESPACE, secretManifest);

        const kafkaUserManifest = {
            apiVersion: STRIMZI_API,
            kind: 'KafkaUser',
            metadata: {
                name,
                namespace: KAFKA_NAMESPACE,
                labels: {
                    'strimzi.io/cluster': KAFKA_STRIMZI_CLUSTER_NAME,
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
            KAFKA_NAMESPACE,
            KAFKA_USER_PLURAL,
            kafkaUserManifest,
        );

        return { name, secret };
    }

    /**
     * Delete a Kafka user from the Kubernetes cluster
     * @param id The unique identifier for the Kafka user
     */
    async deleteKafkaUser(id: string): Promise<void> {
        const name = `kuser-${id}`;
        this.logger.debug(`Deleting Kafka user with name: ${name}`);

        await this.customObjectsApi.deleteNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_USER_PLURAL,
            name,
        );
    }

    /**
     * Create a Mirror Source Kafka Connector in the Kubernetes cluster.
     * The connector is used to mirror topic messages from one topic to another.
     * @param sourceFactoryId
     * @param sourceTopic
     * @param targetTopic
     * @param namespace
     */
    async createMirrorSourceKafkaConnector(
        sourceFactoryId: string,
        sourceTopic: string,
        sourceFactoryUsername: string,
        sourceFactoryPassword: string,
        targetTopic: string,
        targetFactoryUsername: string,
        targetFactoryPassword: string,
        namespace: string = this.config.get<string>('k8s.namespace') ?? 'default',
    ): Promise<void> {
        this.logger.debug('Creating Mirror Source Kafka Connector');

        const bootstrapServers = this.config.get<string>('k8s.kafkaBootstrapServers');
        const targetClusterAlias = 'kafka-target-factory-cluster';

        const kafkaConnectorManifest = {
            apiVersion: `${STRIMZI_API_GROUP}/${STRIMZI_API_VERSION}`,
            kind: 'KafkaConnector',
            metadata: {
                name: `kafka-factory-connector-${sourceFactoryId}`,
                namespace,
                labels: {
                    'strimzi.io/cluster': this.config.get<string>('k8s.strimziClusterName'),
                },
            },
            spec: {
                class: 'org.apache.kafka.connect.mirror.MirrorSourceConnector',
                tasksMax: 1,
                config: {
                    topics: sourceTopic,
                    'target.cluster.alias': targetClusterAlias,
                    'source.cluster.alias': `kafka-source-factory-cluster-${sourceFactoryId}`,
                    'source.cluster.bootstrap.servers': bootstrapServers,
                    'source.cluster.security.protocol': 'SASL_PLAINTEXT',
                    'source.cluster.sasl.mechanism': 'SCRAM-SHA-512',
                    'source.cluster.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${sourceFactoryUsername}" password="${sourceFactoryPassword}";`,
                    'target.cluster.bootstrap.servers': bootstrapServers,
                    'target.cluster.security.protocol': 'SASL_PLAINTEXT',
                    'target.cluster.sasl.mechanism': 'SCRAM-SHA-512',
                    'target.cluster.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${targetFactoryUsername}" password="${targetFactoryPassword}";`,
                    'consumer.override.auto.offset.reset': 'latest',
                    'consumer.override.sasl.mechanism': 'SCRAM-SHA-512',
                    'consumer.override.security.protocol': 'SASL_PLAINTEXT',
                    'consumer.override.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${sourceFactoryUsername}" password="${sourceFactoryPassword}";`,
                    'producer.override.sasl.mechanism': 'SCRAM-SHA-512',
                    'producer.override.security.protocol': 'SASL_PLAINTEXT',
                    'producer.override.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${targetFactoryUsername}" password="${targetFactoryPassword}";`,
                    'key.converter': 'org.apache.kafka.connect.converters.ByteArrayConverter',
                    'value.converter': 'org.apache.kafka.connect.converters.ByteArrayConverter',
                    'sync.group.offsets.enabled': false,
                    'sync.topic.acls.enabled': false,
                    'sync.topic.configs.enabled': false,
                    'replication.policy.class': 'org.apache.kafka.connect.mirror.IdentityReplicationPolicy',
                    transforms: 'RenameTopic',
                    'transforms.RenameTopic.type': 'org.apache.kafka.connect.transforms.RegexRouter',
                    'transforms.RenameTopic.regex': sourceTopic,
                    'transforms.RenameTopic.replacement': targetTopic,
                },
            },
        };

        await this.customObjectsApi.createNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            'kafkaconnectors',
            kafkaConnectorManifest,
        );

        await this.patchKafkaUserInternalAcls(sourceFactoryUsername, targetClusterAlias, namespace);
    }

    async deleteKafkaConnector() {
        //
        return;
    }

    /**
     * Retrieve a Kafka user from the Kubernetes cluster.
     * @param name The name of the Kafka user.
     * @param namespace The namespace in which the Kafka user exists. Defaults to 'default' if not provided.
     * @returns
     */
    async getKafkaUser(
        name: string,
        namespace: string = this.config.get<string>('k8s.namespace') ?? 'default',
    ): Promise<{
        response: IncomingMessage;
        body: object;
    }> {
        this.logger.debug(`Retrieving Kafka user with name: ${name}`);
        return this.customObjectsApi.getNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            KAFKA_USER_PLURAL,
            name,
        );
    }

    /**
     * Update a Kafka user's ACLs to include access to internal MirrorMaker 2 topic for offest synchronization.
     * @param name The name of the Kafka user to patch.
     * @param targetClusterAlias The alias of the target cluster.
     * @param namespace The namespace in which the Kafka user exists. Defaults to 'default' if not provided.
     */
    private async patchKafkaUserInternalAcls(
        name: string,
        targetClusterAlias: string,
        namespace: string = this.config.get<string>('k8s.namespace') ?? 'default',
    ): Promise<void> {
        this.logger.debug(`Patching Kafka user ${name} with internal ACLs for cluster alias ${targetClusterAlias}`);

        const response = await this.getKafkaUser(name, namespace);

        const acls: StrimziAcl[] = (response.body as any).spec.authorization.acls ?? [];
        acls.push({
            resource: {
                type: 'topic',
                name: `mm2-offset-syncs.${targetClusterAlias}.internal`,
                patternType: 'literal',
            },
            operations: ['Write', 'Create', 'Describe'],
        });

        const patchPayload = {
            spec: {
                authorization: {
                    type: 'simple',
                    acls,
                },
            },
        };

        await this.customObjectsApi.patchNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            namespace,
            KAFKA_USER_PLURAL,
            name,
            patchPayload,
        );
    }
}
