import type Player from 'video.js/dist/types/player';
import type { VideojsVttSnapshotOptions, SnapshotData } from './interface';

interface VideoJSSeekBar {
  el: () => HTMLElement;
  calculateDistance: (event: MouseEvent) => number;
}

interface VideoJSProgressControl {
  el: () => HTMLElement;
  on: (event: string, handler: (event: MouseEvent) => void) => void;
  seekBar: VideoJSSeekBar;
}

interface VideoJSControlBar {
  progressControl: VideoJSProgressControl;
}

interface VTTCue {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Video.js plugin for displaying thumbnails from VTT files when hovering over the progress bar
 */
export class VideojsVttSnapshot {
  private player: Player;
  private options: VideojsVttSnapshotOptions;
  private cues: VTTCue[] = [];
  private snapshotElement: HTMLElement | null = null;

  constructor(player: Player, options: VideojsVttSnapshotOptions) {
    this.player = player;
    this.options = {
      snapshotClass: 'vjs-vtt-snapshot',
      ...options
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Fetch and parse VTT file
      const response = await fetch(this.options.vttUrl);
      if (!response.ok) {
        throw new Error(`Failed to load VTT file: ${response.statusText}`);
      }

      const vttText = await response.text();
      this.parseVTT(vttText);

      // Create snapshot element
      this.snapshotElement = document.createElement('div');
      this.snapshotElement.className = this.options.snapshotClass || 'vjs-vtt-snapshot';
      
      if (this.options.snapshotStyle) {
        Object.assign(this.snapshotElement.style, this.options.snapshotStyle);
      }
      
      const playerEl = this.player.el();
      if (!playerEl) return;

      // Add CSS to move time tooltip to bottom
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .video-js .vjs-progress-control .vjs-mouse-display .vjs-time-tooltip {
          bottom: -4em !important;
          top: auto !important;
        }
      `;
      playerEl.appendChild(styleEl);
      playerEl.appendChild(this.snapshotElement);
      
      // Hide snapshot initially
      this.hideSnapshot();

      // Initialize event listeners
      this.initializeEventListeners();
    } catch (error) {
      console.error('Error initializing VTT snapshot:', error);
    }
  }

  private parseVTT(vttText: string): void {
    // Split VTT file into lines
    const lines = vttText.split('\n');
    let currentCue: Partial<VTTCue> | null = null;

    // Skip WebVTT header line
    let i = 1;
    while (i < lines.length) {
      const line = lines[i].trim();

      // Empty line indicates end of cue
      if (line === '') {
        if (currentCue && 'startTime' in currentCue && 'endTime' in currentCue && 'text' in currentCue) {
          this.cues.push(currentCue as VTTCue);
        }
        currentCue = null;
      } 
      // Parse timecode line
      else if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(timeStr => this.parseTimestamp(timeStr.trim()));
        currentCue = { startTime: start, endTime: end };
      }
      // Parse cue text
      else if (currentCue) {
        currentCue.text = line;
      }
      i++;
    }
  }

  private parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':');
    const seconds = parseFloat(parts.pop() || '0');
    const minutes = parseInt(parts.pop() || '0', 10);
    const hours = parseInt(parts.pop() || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private initializeEventListeners(): void {
    // Add event listeners to progress control
    const controlBar = (this.player as any).controlBar as VideoJSControlBar;
    if (!controlBar?.progressControl) return;

    const progressControl = controlBar.progressControl;
    if (!this.isValidProgressControl(progressControl)) return;

    progressControl.on('mousemove', this.handleMouseMove.bind(this));
    progressControl.on('mouseleave', this.handleMouseLeave.bind(this));
  }

  private isValidProgressControl(control: any): control is VideoJSProgressControl {
    return control && 
           typeof control.el === 'function' && 
           typeof control.on === 'function' &&
           control.seekBar &&
           typeof control.seekBar.calculateDistance === 'function';
  }

  private handleMouseMove(event: MouseEvent): void {
    const controlBar = (this.player as any).controlBar as VideoJSControlBar;
    if (!controlBar?.progressControl) return;

    const progressControl = controlBar.progressControl;
    if (!this.isValidProgressControl(progressControl)) return;

    const barRect = progressControl.el().getBoundingClientRect();
    
    // Use seekBar's calculateDistance to get the time directly
    const seekBar = progressControl.seekBar;
    const percent = seekBar.calculateDistance(event);
    const duration = this.player.duration();
    const mouseTime = duration * percent;
    
    // Find the closest cue
    const closestCue = this.findClosestCue(mouseTime);
    
    if (closestCue) {
      const [src, coords] = this.parseVttCue(closestCue);
      let data: SnapshotData = {
        time: mouseTime,
        src,
        ...coords
      };

      // Call beforeHovering callback and use its return value if provided
      if (this.options.beforeHovering) {
        const modifiedData = this.options.beforeHovering(data);
        if (modifiedData) {
          data = modifiedData;
        }
      }

      this.showSnapshot(data, event, barRect);

      // Call onHover callback if provided
      if (this.options.onHover) {
        this.options.onHover(data);
      }
    } else {
      this.hideSnapshot();
    }
  }

  private findClosestCue(time: number): VTTCue | null {
    if (!this.cues.length) return null;

    let closestCue = null;
    let minDistance = Infinity;

    for (const cue of this.cues) {
      // First check if time falls within the cue range
      if (time >= cue.startTime && time <= cue.endTime) {
        return cue;
      }

      // If not within range, find the closest edge
      const distanceToStart = Math.abs(time - cue.startTime);
      const distanceToEnd = Math.abs(time - cue.endTime);
      const distance = Math.min(distanceToStart, distanceToEnd);

      if (distance < minDistance) {
        minDistance = distance;
        closestCue = cue;
      }
    }

    return closestCue;
  }

  private handleMouseLeave(): void {
    this.hideSnapshot();
    if (this.options.onLeave) {
      this.options.onLeave();
    }
  }

  private parseVttCue(cue: VTTCue): [string, { x: number; y: number; w: number; h: number }] {
    const parts = cue.text.trim().split('#');
    const src = parts[0];
    const xywh = parts[1]?.split('=')[1]?.split(',').map(Number) || [0, 0, 160, 90];
    
    return [src, {
      x: xywh[0] || 0,
      y: xywh[1] || 0,
      w: xywh[2] || 160,
      h: xywh[3] || 90
    }];
  }

  private showSnapshot(data: SnapshotData, event: MouseEvent, barRect: DOMRect): void {
    if (!this.snapshotElement) return;

    // Position the snapshot element
    const snapshotRect = this.snapshotElement.getBoundingClientRect();
    const centerX = event.clientX - snapshotRect.width / 2;
    
    // Set the position and background
    Object.assign(this.snapshotElement.style, {
      display: 'block',
      position: 'absolute',
      left: `${centerX}px`,
      bottom: `${barRect.height + 10}px`, // 10px above the progress bar
      width: `${data.w}px`,
      height: `${data.h}px`,
      backgroundImage: `url(${data.src})`,
      backgroundPosition: `-${data.x}px -${data.y}px`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'auto'
    });
  }

  private hideSnapshot(): void {
    if (this.snapshotElement) {
      this.snapshotElement.style.display = 'none';
    }
  }

  private formatTime(seconds: number): string {
    const pad = (num: number): string => num.toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours > 0 ? hours + ':' : ''}${pad(minutes)}:${pad(secs)}.${ms.toString().padStart(3, '0')}`;
  }

  // Public method to dispose the plugin
  dispose(): void {
    if (this.snapshotElement && this.snapshotElement.parentNode) {
      this.snapshotElement.parentNode.removeChild(this.snapshotElement);
    }
  }
} 