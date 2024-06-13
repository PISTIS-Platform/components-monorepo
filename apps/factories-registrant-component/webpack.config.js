const { NxWebpackPlugin } = require('@nx/webpack');
const { join } = require('path');

module.exports = {
    output: {
        path: join(__dirname, '../../dist/apps/factories-registrant-component'),
    },
    plugins: [
        new NxWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: './src/main.ts',
            tsConfig: './tsconfig.app.json',
            assets: ['./src/assets', './src/migrations', './src/orm.config.ts'],
            optimization: false,
            outputHashing: 'none',
        }),
    ],
};
