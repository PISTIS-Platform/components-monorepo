import { Migration } from '@mikro-orm/migrations';

export class Migration20240229113450 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "factories" ("id" uuid not null, "organization_name" varchar(255) not null, "organization_id" varchar(255) not null, "ip" varchar(255) not null, "country" varchar(255) not null, "status" varchar(255) not null, "is_accepted" boolean not null default false, "is_active" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "factories_pkey" primary key ("id"));');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "factories" cascade;');
  }

}
