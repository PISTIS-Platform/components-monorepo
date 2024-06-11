import { Migration } from '@mikro-orm/migrations';

export class Migration20240416094725 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "modelRepository" ("id" uuid not null, "title" varchar(255) not null, "description" varchar(255) not null, "type" varchar(255) not null, "version" varchar(255) not null, "size" int not null, "data" varchar(255) not null, "filepath" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "modelRepository_pkey" primary key ("id"));');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "modelRepository" cascade;');
  }

}
