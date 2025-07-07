// Use the global videojs instance
import videojs from 'video.js';

import type Player from 'video.js/dist/types/player';
import { VideojsVttSnapshot } from './videojs-vtt-snapshot';
import type { VideojsVttSnapshotOptions } from './interface';
export * from './interface';

// Create a plugin class that extends Video.js's base plugin
class VttSnapshotPlugin {
  private player: Player;
  private instance: VideojsVttSnapshot;

  constructor(player: Player, options: VideojsVttSnapshotOptions) {
    this.player = player;
    this.instance = new VideojsVttSnapshot(player, options);
  }

  ready() {
    return this.instance.ready();
  }

  dispose() {
    if (this.instance) {
      this.instance.dispose();
    }
  }
}

// Get the plugin registration function
const registerPlugin = videojs.registerPlugin || (videojs as any).plugin;

// Plugin registration function
function vttSnapshotPlugin(this: Player, options: VideojsVttSnapshotOptions) {
  return new VttSnapshotPlugin(this, options);
}

// Register the plugin with Video.js
registerPlugin('vttSnapshot', vttSnapshotPlugin);

// Handle browser environment
declare global {
  interface Window {
    videojs: any;
  }
}

if (typeof window !== 'undefined' && window.videojs) {
  const videojsInstance = window.videojs;
  if (!videojsInstance.getPlugin('vttSnapshot')) {
    videojsInstance.registerPlugin('vttSnapshot', vttSnapshotPlugin);
  }
}

export default VttSnapshotPlugin;
export { VideojsVttSnapshot };
