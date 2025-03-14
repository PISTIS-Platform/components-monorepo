module.exports = {
    root: true,
    ignorePatterns: ['**/*'],
    plugins: ['@nx', 'simple-import-sort', 'unused-imports'],
    overrides: [
        {
            files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
            rules: {
                '@nx/enforce-module-boundaries': [
                    'error',
                    {
                        enforceBuildableLibDependency: true,
                        allow: [],
                        depConstraints: [
                            {
                                sourceTag: '*',
                                onlyDependOnLibsWithTags: ['*'],
                            },
                        ],
                    },
                ],
            },
        },
        {
            files: ['*.ts', '*.tsx'],
            extends: ['plugin:@nx/typescript'],
            rules: {
                'unused-imports/no-unused-imports': 'error',
                'simple-import-sort/imports': 'error',
                'simple-import-sort/exports': 'error',
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
                '@typescript-eslint/interface-name-prefix': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
        {
            files: ['*.js', '*.jsx'],
            extends: ['plugin:@nx/javascript'],
            rules: {},
        },
        {
            files: ['*.spec.ts', '*.spec.tsx', '*.spec.js', '*.spec.jsx'],
            env: {
                jest: true,
            },
            rules: {},
        },
    ],
};
