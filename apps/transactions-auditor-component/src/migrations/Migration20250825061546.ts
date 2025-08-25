import { Migration } from '@mikro-orm/migrations';

export class Migration20250825061546 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "transactions_auditor" ("id" uuid not null, "transaction_id" varchar(255) not null, "transaction_fee" real null, "amount" real not null, "factory_buyer_id" varchar(255) not null, "factory_buyer_name" varchar(255) not null, "factory_seller_id" varchar(255) not null, "factory_seller_name" varchar(255) not null, "asset_id" varchar(255) not null, "asset_name" varchar(255) not null, "terms" text not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "transactions_auditor_pkey" primary key ("id"));');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "transactions_auditor" cascade;');
  }

}
