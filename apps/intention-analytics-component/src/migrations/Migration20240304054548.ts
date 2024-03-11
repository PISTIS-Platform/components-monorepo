import { Migration } from '@mikro-orm/migrations';

export class Migration20240304054548 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "questionnaires" ("id" uuid not null, "version" bigint not null, "creator_id" varchar(255) not null, "is_for_verified_buyers" boolean not null, "title" varchar(255) not null, "description" varchar(255) null, "is_active" boolean not null, "publication_date" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "questionnaires_pkey" primary key ("id", "version"));');

    this.addSql('create table "questions" ("id" uuid not null, "type" varchar(255) not null, "title" varchar(255) not null, "description" varchar(255) null, "is_required" boolean not null default false, "options" jsonb null, "questionnaire_id" uuid not null, "questionnaire_version" bigint not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "questions_pkey" primary key ("id"));');

    this.addSql('create table "answers" ("id" uuid not null, "responses" jsonb not null, "user_id" varchar(255) not null, "asset_id" varchar(255) not null, "questionnaire_id" uuid not null, "questionnaire_version" bigint not null, "created_at" timestamptz not null, constraint "answers_pkey" primary key ("id"));');
    this.addSql('create index "answers_user_id_index" on "answers" ("user_id");');
    this.addSql('create index "answers_asset_id_index" on "answers" ("asset_id");');
    this.addSql('create index "answers_questionnaire_id_questionnaire_version_index" on "answers" ("questionnaire_id", "questionnaire_version");');
    this.addSql('alter table "answers" add constraint "answers_user_id_asset_id_questionnaire_id_question_9264e_unique" unique ("user_id", "asset_id", "questionnaire_id", "questionnaire_version");');

    this.addSql('alter table "questions" add constraint "questions_questionnaire_id_questionnaire_version_foreign" foreign key ("questionnaire_id", "questionnaire_version") references "questionnaires" ("id", "version") on update cascade;');

    this.addSql('alter table "answers" add constraint "answers_questionnaire_id_questionnaire_version_foreign" foreign key ("questionnaire_id", "questionnaire_version") references "questionnaires" ("id", "version") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "questions" drop constraint "questions_questionnaire_id_questionnaire_version_foreign";');

    this.addSql('alter table "answers" drop constraint "answers_questionnaire_id_questionnaire_version_foreign";');

    this.addSql('drop table if exists "questionnaires" cascade;');

    this.addSql('drop table if exists "questions" cascade;');

    this.addSql('drop table if exists "answers" cascade;');
  }

}
