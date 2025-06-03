export type KafkaAclResourceType = 'topic' | 'group';

export type KafkaAclOperation = 'All' | 'Read' | 'Write' | 'Create' | 'Delete' | 'Describe';

export type KafkaAclResourcePatternType = 'literal' | 'prefix';

export interface StrimziAclResource {
    type: KafkaAclResourceType;
    name: string;
    patternType?: KafkaAclResourcePatternType;
}

export interface StrimziAcl {
    resource: StrimziAclResource;
    operations: KafkaAclOperation[];
    host?: string; // Defaults to '*' (all hosts) if omitted in the KafkaUser.
    type?: 'allow' | 'deny';
}
