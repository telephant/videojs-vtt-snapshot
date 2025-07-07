import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife', 'esm'],
  dts: true,
  clean: true,
  minify: true,
  globalName: 'VideojsVttSnapshot',
  external: ['video.js'],
  noExternal: ['video.js'],
  platform: 'browser',
  target: 'es2015',
  sourcemap: true
}); 