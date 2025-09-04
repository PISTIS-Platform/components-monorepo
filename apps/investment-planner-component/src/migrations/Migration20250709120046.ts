import { Migration } from '@mikro-orm/migrations';

export class Migration20250709120046 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "investmentPlanner" alter column "remaining_shares" type int using ("remaining_shares"::int);');
    this.addSql('alter table "investmentPlanner" alter column "remaining_shares" drop not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "investmentPlanner" alter column "remaining_shares" type int using ("remaining_shares"::int);');
    this.addSql('alter table "investmentPlanner" alter column "remaining_shares" set not null;');
  }

}
