import { Migration } from '@mikro-orm/migrations';

export class Migration20240418103559 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "modelRepository" alter column "size" type real using ("size"::real);');
  }

  async down(): Promise<void> {
    this.addSql('alter table "modelRepository" alter column "size" type int using ("size"::int);');
  }

}
