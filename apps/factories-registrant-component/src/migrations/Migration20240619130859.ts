import { Migration } from '@mikro-orm/migrations';

export class Migration20240619130859 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "factories" alter column "ip" type varchar(255) using ("ip"::varchar(255));');
    this.addSql('alter table "factories" alter column "ip" drop not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "factories" alter column "ip" type varchar(255) using ("ip"::varchar(255));');
    this.addSql('alter table "factories" alter column "ip" set not null;');
  }

}
