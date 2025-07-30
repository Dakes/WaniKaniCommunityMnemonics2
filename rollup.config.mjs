
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescriptPlugin from '@rollup/plugin-typescript';
import typescript from 'typescript';
import metablock from 'rollup-plugin-userscript-metablock';
import sass from 'rollup-plugin-sass';

import fs from 'fs';
import path from 'path';

import pkg from './package.json' with { type: 'json' };

import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import css from 'rollup-plugin-css-only';
import terser from '@rollup/plugin-terser';
import MagicString from 'magic-string';

// Create the 'dist' directory if it doesn't exist
fs.mkdir('dist/', { recursive: true }, () => null);

// Determine if we are in production mode
const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/index.ts', // Adjust if your main Svelte file is different
    output: {
        file: process.env.ROLLUP_WATCH ? 'dist/WKCM2_dev.user.js' : 'dist/WKCM2.user.js',
        format: 'iife',
        name: 'rollupUserScript',
        sourcemap: process.env.ROLLUP_WATCH ? true : false,
        globals: {
            // react: 'React',
            // 'react-dom': 'ReactDOM'
        }
    },
    plugins: [
        // Metablock for userscript metadata - IMPORTANT: Needs to be FIRST to ensure headers come before code
        metablock({
            file: './meta.json',
            override: {
                name: pkg.name,
                version: pkg.version,
                description: pkg.description,
                homepage: pkg.homepage,
                author: pkg.author,
                license: pkg.license
            }
        }),
        
        // Svelte plugin
        svelte({
            extensions: ['.svelte'],
            preprocess: [
                sveltePreprocess({
                    sourceMap: !production,
                    scss: {
                        includePaths: ['src'],
                    },
                    typescript: {
                        transpileOnly: true,
                    },
                }),
            ],
            compilerOptions: {
                dev: !production,
            },
        }),

        // Extract CSS from Svelte components
        css({
            output: 'bundle.css',
        }),

        // Custom plugin to inject CSS for Tampermonkey
        (() => ({
            name: 'rollup-plugin-tampermonkey-css',
            renderChunk(code, renderedChunk, outputOptions) {
                let magicString = new MagicString(code);
                // Simple GM_addStyle call - the metablock plugin should have already added the necessary @grant permissions
                // Note: We'll handle this in the post-processing script
                // magicString.prepend(`GM_addStyle(GM_getResourceText('css'));\n`);
                const result = { code: magicString.toString() };
                if (outputOptions.sourceMap !== false) {
                    result.map = magicString.generateMap({ hires: true });
                }
                return result;
            },
        }))(),

        // SASS plugin for global styles (optional if you handle styles within Svelte)
        sass({
            output: 'dist/global.css', // Renamed to avoid conflict with Svelte's bundle.css
            insert: true,
        }),

        // Replace environment variables
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            ENVIRONMENT: JSON.stringify('production'),
            preventAssignment: true
        }),

        // Resolve node modules
        nodeResolve({ extensions: ['.js', '.ts', '.tsx', '.svelte'] }), // Include .svelte
        commonjs(),

        // TypeScript plugin
        typescriptPlugin({
            typescript,
            sourceMap: !production,
            inlineSources: !production,
        }),

        // Babel plugin (if needed for further transpilation)
        babel({
            babelHelpers: 'bundled',
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.svelte'], // Ensure Babel processes Svelte files if needed
        }),

        // Minify the bundle in production
        production && terser(),
    ],
    watch: {
        clearScreen: false,
    },
    external: id => /^react(-dom)?$/.test(id) // Externalize React dependencies
}