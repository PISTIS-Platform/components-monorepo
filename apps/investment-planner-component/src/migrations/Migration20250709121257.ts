import { Migration } from '@mikro-orm/migrations';

export class Migration20250709121257 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "investmentPlanner" add column "asset_id" varchar(255) not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "investmentPlanner" drop column "asset_id";');
  }

}
