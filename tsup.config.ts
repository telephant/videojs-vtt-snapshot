import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig([
  // ESM build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    minify: isProduction,
    external: ['video.js'],
    platform: 'browser',
    target: 'es2015',
    sourcemap: !isProduction
  },
]); 