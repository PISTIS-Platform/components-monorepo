import { Migration } from '@mikro-orm/migrations';

export class Migration20250711101827 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "investmentPlanner" add column "keywords" text[] not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "investmentPlanner" drop column "keywords";');
  }

}
