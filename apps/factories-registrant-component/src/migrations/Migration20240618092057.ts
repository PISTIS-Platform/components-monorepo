import { Migration } from '@mikro-orm/migrations';

export class Migration20240618092057 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create table "clientInfo" ("id" uuid not null, "clients_ids" text[] not null, "organization_id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "clientInfo_pkey" primary key ("id"));',
        );

        this.addSql(
            'create table "registeredServices" ("id" uuid not null, "service_name" varchar(255) not null, "service_url" varchar(255) not null, "is_on" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "registeredServices_pkey" primary key ("id"));',
        );
        this.addSql(
            'alter table "registeredServices" add constraint "registeredServices_service_url_unique" unique ("service_url");',
        );

        this.addSql('alter table "factories" add column "factory_prefix" varchar(255) not null;');
        this.addSql(
            'alter table "factories" add constraint "factories_organization_id_unique" unique ("organization_id");',
        );
        this.addSql(
            'alter table "factories" add constraint "factories_factory_prefix_unique" unique ("factory_prefix");',
        );
    }

    async down(): Promise<void> {
        this.addSql('drop table if exists "clientInfo" cascade;');

        this.addSql('drop table if exists "registeredServices" cascade;');

        this.addSql('alter table "factories" drop constraint "factories_organization_id_unique";');
        this.addSql('alter table "factories" drop constraint "factories_factory_prefix_unique";');
        this.addSql('alter table "factories" drop column "factory_prefix";');
    }
}
