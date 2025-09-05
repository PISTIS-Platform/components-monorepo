import { Migration } from '@mikro-orm/migrations';

export class Migration20250905134217 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "investmentPlanner" drop column "title";');
    this.addSql('alter table "investmentPlanner" drop column "access_policy";');
    this.addSql('alter table "investmentPlanner" drop column "keywords";');
  }

  async down(): Promise<void> {
    this.addSql('alter table "investmentPlanner" add column "title" varchar(255) not null, add column "access_policy" jsonb not null, add column "keywords" text[] not null;');
  }

}
