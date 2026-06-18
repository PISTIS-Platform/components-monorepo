import { Migration } from '@mikro-orm/migrations';

export class Migration20260618131417 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "factories" add column "iban" varchar(255) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "factories" drop column "iban";`);
  }

}
