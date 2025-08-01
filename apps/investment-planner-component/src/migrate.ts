import { Migrator } from '@mikro-orm/migrations';
import { MikroORM } from '@mikro-orm/postgresql';

(async () => {
    const orm = await MikroORM.init({
        extensions: [Migrator],
        migrations: {
            path: './migrations/',
            disableForeignKeys: false,
        },
        dbName: process.env.DB_NAME || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'suite5',
        discovery: {
            warnWhenNoEntities: false,
        },
    });

    const migrator = orm.getMigrator();
    await migrator.up(); // runs migrations up to the latest
    await orm.close(true);
})();
