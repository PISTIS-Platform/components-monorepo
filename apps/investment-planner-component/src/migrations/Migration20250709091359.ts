import { Migration } from '@mikro-orm/migrations';

export class Migration20250709091359 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "investmentPlanner" alter column "percentage_offer" type int using ("percentage_offer"::int);');
  }

  async down(): Promise<void> {
    this.addSql('alter table "investmentPlanner" alter column "percentage_offer" type varchar(255) using ("percentage_offer"::varchar(255));');
  }

}
