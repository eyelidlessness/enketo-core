const alias = require('esbuild-plugin-alias');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const isProduction = process.env.NODE_ENV === 'production';

const cwd = process.cwd();

const aliases = Object.fromEntries(
    Object.entries(pkg.browser).map(([key, value]) => [
        key,
        path.resolve(cwd, value).replace(/(\.js)?$/, '.js'),
    ])
);

const fontBasePath = path.resolve(cwd, './src/fonts/Roboto');
const fontPaths = fs
    .readdirSync(fontBasePath)
    .filter((fileName) => fileName.endsWith('.woff'))
    .map((fileName) => path.resolve(fontBasePath, fileName));

esbuild.build({
    assetNames: '[name]',
    bundle: true,
    entryPoints: [
        'src/index.html',
        'app.js',
        'src/images/odk-logo.svg',
        ...fontPaths,
    ],
    format: 'iife',
    loader: {
        '.html': 'file',
        '.png': 'file',
        '.svg': 'file',
        '.woff': 'file',
    },
    minify: isProduction,
    outdir: 'build',
    plugins: [alias(aliases)],
    sourcemap: isProduction ? false : 'inline',
    target: ['chrome89', 'edge89', 'firefox90', 'safari13'],
});
