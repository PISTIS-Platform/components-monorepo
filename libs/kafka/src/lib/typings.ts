export type KafkaAclResourceType = 'topic' | 'group';

export type KafkaAclOperation = 'All' | 'Read' | 'Write' | 'Create' | 'Delete' | 'Describe';

export type KafkaAclResourcePatternType = 'literal' | 'prefix';

export type StrimziAclResource = {
    type: KafkaAclResourceType;
    name: string;
    patternType?: KafkaAclResourcePatternType;
};

export type StrimziAcl = {
    resource: StrimziAclResource;
    operations: KafkaAclOperation[];
    host?: string; // Defaults to '*' (all hosts) if omitted in the KafkaUser.
    type?: 'allow' | 'deny';
};

export type MM2ConnectorConfig = {
    source: {
        id: string;
    };
    target: {
        id: string;
        username: string;
        password: string;
        bootstrapServers: string;
    };
};
