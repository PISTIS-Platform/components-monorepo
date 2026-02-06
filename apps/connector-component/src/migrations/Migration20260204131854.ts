import { Migration } from '@mikro-orm/migrations';

export class Migration20260204131854 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "querySelector" ("id" varchar(255) not null, "cloud_asset_id" varchar(255) not null, "params" jsonb not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "querySelector_pkey" primary key ("id"));`);
    this.addSql(`alter table "querySelector" add constraint "querySelector_cloud_asset_id_unique" unique ("cloud_asset_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "querySelector" cascade;`);
  }

}
