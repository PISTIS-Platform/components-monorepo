import { Migration } from '@mikro-orm/migrations';

export class Migration20260618123532 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "factories" add column "last_seen_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "factories" drop column "last_seen_at";`);
  }

}
