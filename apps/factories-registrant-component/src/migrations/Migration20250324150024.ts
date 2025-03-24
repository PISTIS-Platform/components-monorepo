import { Migration } from '@mikro-orm/migrations';

export class Migration20250324150024 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "registeredServices" add column "client_authentication" boolean not null default true;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "registeredServices" drop column "client_authentication";');
  }

}
