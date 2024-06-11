import { Migration } from '@mikro-orm/migrations';

export class Migration20240417110650 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "modelRepository" alter column "data" type bytea using ("data"::bytea);');
  }

  async down(): Promise<void> {
    this.addSql('alter table "modelRepository" alter column "data" type varchar(255) using ("data"::varchar(255));');
  }

}
