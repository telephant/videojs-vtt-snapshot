// Use the global videojs instance
declare const videojs: any;

import type Player from 'video.js/dist/types/player';
import { VideojsVttSnapshot } from './videojs-vtt-snapshot';
import type { VideojsVttSnapshotOptions } from './interface';

// Register the plugin with Video.js
const registerPlugin = videojs.registerPlugin || videojs.plugin;

// Register the plugin
function vttSnapshotPlugin(this: Player, options: VideojsVttSnapshotOptions) {
  const instance = new VideojsVttSnapshot(this, options);
  (this as any).vttSnapshot = instance;
  return instance;
}

registerPlugin('vttSnapshot', vttSnapshotPlugin);

// Export types and class
export * from './interface';
export { VideojsVttSnapshot };
