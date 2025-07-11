import { Migration } from '@mikro-orm/migrations';

export class Migration20250710071051 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "userInvestment" ("id" uuid not null, "cloud_asset_id" varchar(255) not null, "user_id" varchar(255) not null, "shares" int not null, "investment_plan_id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "userInvestment_pkey" primary key ("id"));');
    this.addSql('alter table "userInvestment" add constraint "userInvestment_cloud_asset_id_unique" unique ("cloud_asset_id");');
    this.addSql('create index "userInvestment_investment_plan_id_index" on "userInvestment" ("investment_plan_id");');

    this.addSql('alter table "userInvestment" add constraint "userInvestment_investment_plan_id_foreign" foreign key ("investment_plan_id") references "investmentPlanner" ("id") on update cascade;');

    this.addSql('alter table "investmentPlanner" add column "title" varchar(255) not null, add column "description" varchar(255) not null, add column "terms" jsonb not null, add column "seller_id" varchar(255) not null;');
    this.addSql('alter table "investmentPlanner" alter column "due_date" type timestamptz using ("due_date"::timestamptz);');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "userInvestment" cascade;');

    this.addSql('alter table "investmentPlanner" drop column "title";');
    this.addSql('alter table "investmentPlanner" drop column "description";');
    this.addSql('alter table "investmentPlanner" drop column "terms";');
    this.addSql('alter table "investmentPlanner" drop column "seller_id";');

    this.addSql('alter table "investmentPlanner" alter column "due_date" type varchar(255) using ("due_date"::varchar(255));');
  }

}
