import { Migration } from '@mikro-orm/migrations';

export class Migration20240919112844 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "notifications" alter column "organization_id" type varchar(255) using ("organization_id"::varchar(255));');
    this.addSql('alter table "notifications" alter column "organization_id" drop not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "notifications" alter column "organization_id" type varchar(255) using ("organization_id"::varchar(255));');
    this.addSql('alter table "notifications" alter column "organization_id" set not null;');
  }

}
