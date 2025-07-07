import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife', 'esm'],
  dts: true,
  clean: true,
  minify: isProduction,
  globalName: 'VttSnapshot',
  external: ['video.js'],
  noExternal: ['video.js'],
  platform: 'browser',
  target: 'es2015',
  sourcemap: !isProduction
}); 