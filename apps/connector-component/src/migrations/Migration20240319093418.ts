import { Migration } from '@mikro-orm/migrations';

export class Migration20240319093418 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "assetRetrievalInfo" ("id" varchar(255) not null, "cloud_asset_id" varchar(255) not null, "version" varchar(255) null, "offset" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "assetRetrievalInfo_pkey" primary key ("id"));');
    this.addSql('alter table "assetRetrievalInfo" add constraint "assetRetrievalInfo_cloud_asset_id_unique" unique ("cloud_asset_id");');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "assetRetrievalInfo" cascade;');
  }

}
