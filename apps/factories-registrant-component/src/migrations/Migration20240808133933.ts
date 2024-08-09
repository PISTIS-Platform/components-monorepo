import { Migration } from '@mikro-orm/migrations';

export class Migration20240808133933 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "registeredServices" add column "sar" boolean not null default false;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "registeredServices" drop column "sar";');
  }

}
