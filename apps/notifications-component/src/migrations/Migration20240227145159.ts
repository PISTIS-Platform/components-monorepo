import { Migration } from '@mikro-orm/migrations';

export class Migration20240227145159 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create table "notifications" ("id" uuid not null, "user_id" varchar(255) not null, "organization_id" varchar(255) not null, "type" varchar(255) not null, "message" varchar(255) not null, "read_at" timestamptz null, "is_hidden" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "notifications_pkey" primary key ("id"));',
        );
    }

    async down(): Promise<void> {
        this.addSql('drop table if exists "notifications" cascade;');
    }
}
