import { Migration } from '@mikro-orm/migrations';

export class Migration20250711114936 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "investmentPlanner" add column "access_policy" jsonb not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "investmentPlanner" drop column "access_policy";');
  }

}
