import { CoreV1Api, CustomObjectsApi, KubeConfig, PatchUtils, V1Secret } from '@kubernetes/client-node';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generatePassword, getHeaders } from '@pistis/shared';
import { IncomingMessage } from 'http';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { MM2ConnectorConfig, StrimziAcl } from './typings';

const STRIMZI_API_GROUP = 'kafka.strimzi.io';
const STRIMZI_API_VERSION = 'v1beta2';
const STRIMZI_API = `${STRIMZI_API_GROUP}/${STRIMZI_API_VERSION}`;
const STRIMZI_CLUSTER_NAME = 'kafka-cluster';

const KAFKA_NAMESPACE = 'default';
const KAFKA_TOPIC_PLURAL = 'kafkatopics';
const KAFKA_USER_PLURAL = 'kafkausers';
const KAFKA_CONNECTOR_PLURAL = 'kafkaconnectors';
const KAFKA_CONNECT_CLUSTER_NAME = 'kafka-connect';

const KAFKA_TOPIC_PREFIX = 'ds';
const KAFKA_USER_PREFIX = 'kuser';

@Injectable()
export class KafkaService {
    private readonly logger = new Logger(KafkaService.name);
    private readonly coreApi: CoreV1Api;
    private readonly customObjectsApi: CustomObjectsApi;

    constructor(private readonly config: ConfigService, private readonly httpService: HttpService) {
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
     * @param retentionMs The duration in ms for how long the messages will remain stored within topic
     * @returns The name of the created Kafka topic
     */
    async createTopic(id: string, retentionMs?: number): Promise<string> {
        const name = `${KAFKA_TOPIC_PREFIX}-${id}`;
        this.logger.debug(`Creating Kafka topic "${name}"`);

        const kafkaTopicManifest = {
            apiVersion: STRIMZI_API,
            kind: 'KafkaTopic',
            metadata: {
                name,
                namespace: KAFKA_NAMESPACE,
                labels: {
                    'strimzi.io/cluster': STRIMZI_CLUSTER_NAME,
                },
            },
            spec: {
                partitions: this.config.get<number>('kafka.topicPartition'),
                replicas: this.config.get<number>('kafka.topicReplicas'),
                config: {
                    'retention.ms': retentionMs ?? this.config.get<number>('kafka.topicRetentionMs'),
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
        const name = `${KAFKA_TOPIC_PREFIX}-${id}`;
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
    async createUser(id: string, acls: StrimziAcl[]): Promise<{ name: string; secret: string }> {
        const name = `${KAFKA_USER_PREFIX}-${id}`;
        this.logger.debug(`Creating Kafka user "${name}"`);

        const secret = generatePassword(32);
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
                    'strimzi.io/cluster': STRIMZI_CLUSTER_NAME,
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
     * Create a Kafka provider user in the Kubernetes cluster
     * @param id The unique identifier for the Kafka user
     * @returns
     */
    async createProviderUser(id: string) {
        return await this.createUser(id, [
            {
                resource: { type: 'topic', name: `${KAFKA_TOPIC_PREFIX}-${id}`, patternType: 'literal' },
                operations: ['Read', 'Write', 'Create'],
                type: 'allow',
            },
        ]);
    }

    /**
     * Create a Kafka consumer user in the Kubernetes cluster
     * @param id The unique identifier for the Kafka user
     * @returns
     */
    async createConsumerUser(id: string) {
        return await this.createUser(id, [
            {
                resource: { type: 'topic', name: `${KAFKA_TOPIC_PREFIX}-${id}`, patternType: 'literal' },
                operations: ['Write', 'Create'],
                type: 'allow',
            },
        ]);
    }

    /**
     * Delete a Kafka user from the Kubernetes cluster
     * @param id The unique identifier for the Kafka user
     */
    async deleteUser(id: string): Promise<void> {
        const name = `${KAFKA_USER_PREFIX}-${id}`;
        this.logger.debug(`Deleting Kafka user "${name}"`);

        await this.customObjectsApi.deleteNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_USER_PLURAL,
            name,
        );
    }

    /**
     * Create a MirrorSource Kafka connector in the Kubernetes cluster
     * @param config The configuration for the Kafka connector
     */
    async createMM2Connector(config: MM2ConnectorConfig): Promise<void> {
        const name = `kc-${config.source.id}--${config.target.id}`;
        this.logger.debug(`Creating MirrorSource Kafka connector "${name}"`);

        const sourceBootstrapServers = this.config.get<string>('kafka.bootstrapServers');
        const sourceClusterAlias = `kc-source-${generatePassword(10)}`;
        const targetClusterAlias = 'kc-target';

        const providerTopic = `${KAFKA_TOPIC_PREFIX}-${config.source.id}`;
        const providerUsername = `${KAFKA_USER_PREFIX}-${config.source.id}`;
        const providerPassword = this.getDecodedSecret(providerUsername);

        const consumerTopic = `${KAFKA_TOPIC_PREFIX}-${config.target.id}`;

        const kafkaConnectorManifest = {
            apiVersion: STRIMZI_API,
            kind: 'KafkaConnector',
            metadata: {
                name,
                namespace: KAFKA_NAMESPACE,
                labels: {
                    'strimzi.io/cluster': KAFKA_CONNECT_CLUSTER_NAME,
                },
            },
            spec: {
                class: 'org.apache.kafka.connect.mirror.MirrorSourceConnector',
                tasksMax: 1,
                config: {
                    topics: providerTopic,
                    'target.cluster.alias': targetClusterAlias,
                    'source.cluster.alias': sourceClusterAlias,
                    'source.cluster.bootstrap.servers': sourceBootstrapServers,
                    'source.consumer.auto.offset.reset': 'latest',
                    'source.cluster.security.protocol': 'SASL_PLAINTEXT',
                    'source.cluster.sasl.mechanism': 'SCRAM-SHA-512',
                    'source.cluster.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${providerUsername}" password="${providerPassword}";`,
                    'target.cluster.bootstrap.servers': config.target.bootstrapServers,
                    'target.cluster.security.protocol': 'SASL_PLAINTEXT',
                    'target.cluster.sasl.mechanism': 'SCRAM-SHA-512',
                    'target.cluster.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${config.target.username}" password="${config.target.password}";`,
                    'consumer.override.sasl.mechanism': 'SCRAM-SHA-512',
                    'consumer.override.security.protocol': 'SASL_PLAINTEXT',
                    'consumer.override.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${providerUsername}" password="${providerPassword}";`,
                    'producer.override.sasl.mechanism': 'SCRAM-SHA-512',
                    'producer.override.security.protocol': 'SASL_PLAINTEXT',
                    'producer.override.sasl.jaas.config': `org.apache.kafka.common.security.scram.ScramLoginModule required username="${config.target.username}" password="${config.target.password}";`,
                    'key.converter': 'org.apache.kafka.connect.converters.ByteArrayConverter',
                    'value.converter': 'org.apache.kafka.connect.converters.ByteArrayConverter',
                    'sync.group.offsets.enabled': false,
                    'sync.topic.acls.enabled': false,
                    'sync.topic.configs.enabled': false,
                    'replication.policy.class': 'org.apache.kafka.connect.mirror.IdentityReplicationPolicy',
                    transforms: 'RenameTopic',
                    'transforms.RenameTopic.type': 'org.apache.kafka.connect.transforms.RegexRouter',
                    'transforms.RenameTopic.regex': providerTopic,
                    'transforms.RenameTopic.replacement': consumerTopic,
                },
            },
        };

        await this.customObjectsApi.createNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_CONNECTOR_PLURAL,
            kafkaConnectorManifest,
        );

        await this.patchMM2OffsetSyncsAcls(providerUsername, targetClusterAlias);
    }

    /**
     * Delete a MirrorSource Kafka connector from the Kubernetes cluster
     * @param sourceId The unique identifier for the source
     * @param targetId The unique identifier for the target
     */
    async deleteMM2Connector(sourceId: string, targetId: string): Promise<void> {
        const name = `kc-${sourceId}--${targetId}`;
        this.logger.debug(`Deleting Kafka connector "${name}"`);

        await this.customObjectsApi.deleteNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_CONNECTOR_PLURAL,
            name,
        );
    }

    /**
     * Retrieve a Kafka user from the Kubernetes cluster.
     * @param name The name of the Kafka user.
     * @returns
     */
    async getUser(name: string): Promise<{ response: IncomingMessage; body: object }> {
        this.logger.debug(`Retrieving Kafka user "${name}"`);
        return this.customObjectsApi.getNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_USER_PLURAL,
            name,
        );
    }

    /**
     * Retrieve decoded secret for a Kafka user
     * @param id The unique identifier for the Kafka secret
     * @returns
     */
    async getDecodedSecret(id: string): Promise<string | null> {
        const secret = await this.getSecret(`${KAFKA_USER_PREFIX}-${id}`);
        return this.decodeSecret(secret);
    }

    /**
     * Retrieve the Read-Only access user and connection details
     * @param token The factory authenticated user token for retrieving factory data
     * @returns
     */
    async getFactoryConnectionDetails(token: string): Promise<{
        username: string;
        password: string;
        bootstrapServers: string;
        securityProtocol: string;
        saslMechanism: string;
    }> {
        // retrieve factory data
        const factory = await firstValueFrom(
            this.httpService
                .get(`${this.config.get('app.factoryRegistryUrl')}/api/factories/user-factory`, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map(async (res) => res.data),
                    catchError((e) => of({ error: `'Error occurred during retrieving factory: ${e}` })),
                ),
        );

        const factoryName = factory.factoryPrefix;
        let password = '';

        if (factoryName) {
            // retrieve user to validate if exists with the given name
            await this.getUser(factoryName);
            // retrieve decoded password from secret
            password = (await this.getDecodedSecret(factoryName)) ?? '';
        }

        const externalPorts = this.config.get('kafka.externalPorts')?.split(',') ?? [];
        return {
            username: factoryName,
            password,
            bootstrapServers: externalPorts
                .map((port: string) => `kafka.${factoryName}.pistis-market.eu:${port}`)
                .join(','),
            securityProtocol: 'SASL_PLAINTEXT',
            saslMechanism: 'SCRAM-SHA-512',
        };
    }

    /**
     * Retrieve a Kafka user secret from the Kubernetes cluster
     * @param name The name of the Kafka user secret
     * @returns
     */
    private async getSecret(name: string): Promise<V1Secret> {
        this.logger.debug(`Retrieving Kafka user secret "${name}"`);
        return (await this.coreApi.readNamespacedSecret(name, KAFKA_NAMESPACE)).body;
    }

    /**
     * Update a Kafka user's ACLs to include access to internal MirrorMaker 2 topic for offest synchronization
     * @param name The name of the Kafka user to patch
     * @param targetClusterAlias The alias of the target cluster
     */
    private async patchMM2OffsetSyncsAcls(name: string, targetClusterAlias: string): Promise<void> {
        this.logger.debug(`Patching Kafka user "${name}" with internal ACLs for cluster alias "${targetClusterAlias}"`);

        const response = await this.getUser(name);
        const existingAcls: StrimziAcl[] = (response.body as any).spec.authorization.acls ?? [];

        const topic = `mm2-offset-syncs.${targetClusterAlias}.internal`;
        const topicExists = existingAcls.some((acl) => acl.resource.type === 'topic' && acl.resource.name === topic);
        if (topicExists) {
            this.logger.debug(`Kafka user "${name}" already has ACL for topic "${topic}"`);
            return;
        }

        const patchPayload = [
            {
                op: 'replace',
                path: '/spec/authorization/acls',
                value: [
                    existingAcls[0],
                    {
                        resource: {
                            type: 'topic',
                            name: topic,
                            patternType: 'literal',
                        },
                        operations: ['Write', 'Create', 'Describe'],
                    },
                ],
            },
        ];

        const options = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } };
        await this.customObjectsApi.patchNamespacedCustomObject(
            STRIMZI_API_GROUP,
            STRIMZI_API_VERSION,
            KAFKA_NAMESPACE,
            KAFKA_USER_PLURAL,
            name,
            patchPayload,
            undefined,
            undefined,
            undefined,
            options,
        );
    }

    /**
     * Decode the password from the Kafka user secret
     * @param name The name of the Kafka user secret
     * @returns
     */
    private decodeSecret(secret: V1Secret): string | null {
        const password = secret.data ? secret.data['password'] : null;

        if (!password) {
            this.logger.warn(`No password found for Kafka user secret: ${name}`);
            return null;
        }

        return Buffer.from(password, 'base64').toString('utf-8');
    }
}
