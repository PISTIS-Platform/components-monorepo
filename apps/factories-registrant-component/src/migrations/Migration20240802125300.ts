import { Migration } from '@mikro-orm/migrations';

export class Migration20240802125300 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "registeredServices" alter column "sar" type boolean using ("sar"::boolean);');
    this.addSql('alter table "registeredServices" alter column "sar" set default false;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "registeredServices" alter column "sar" drop default;');
    this.addSql('alter table "registeredServices" alter column "sar" type boolean using ("sar"::boolean);');
  }

}
