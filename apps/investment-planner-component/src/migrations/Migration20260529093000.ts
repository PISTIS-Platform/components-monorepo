import { Migration } from '@mikro-orm/migrations';

export class Migration20260529093000 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "userInvestment" drop constraint "userInvestment_cloud_asset_id_unique";');
    this.addSql('alter table "userInvestment" add constraint "userInvestment_cloud_asset_id_user_id_unique" unique ("cloud_asset_id", "user_id");');
  }

  async down(): Promise<void> {
    // NOTE: restoring the global unique on cloud_asset_id will fail once multiple investors
    // exist for the same asset. This is expected for a uniqueness-correction migration.
    this.addSql('alter table "userInvestment" drop constraint "userInvestment_cloud_asset_id_user_id_unique";');
    this.addSql('alter table "userInvestment" add constraint "userInvestment_cloud_asset_id_unique" unique ("cloud_asset_id");');
  }

}
