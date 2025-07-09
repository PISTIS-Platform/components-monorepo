import { Migration } from '@mikro-orm/migrations';

export class Migration20250709090940 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "investmentPlanner" ("id" varchar(255) not null, "cloud_asset_id" varchar(255) not null, "due_date" varchar(255) not null, "percentage_offer" varchar(255) not null, "total_shares" int not null, "remaining_shares" int not null, "max_shares" int not null, "price" int not null, "status" boolean not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "investmentPlanner_pkey" primary key ("id"));');
    this.addSql('alter table "investmentPlanner" add constraint "investmentPlanner_cloud_asset_id_unique" unique ("cloud_asset_id");');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "investmentPlanner" cascade;');
  }

}
