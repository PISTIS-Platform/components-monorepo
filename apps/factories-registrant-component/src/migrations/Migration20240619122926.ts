import { Migration } from '@mikro-orm/migrations';

export class Migration20240619122926 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "factories" add column "status" varchar(255) not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "factories" drop column "status";');
  }

}
