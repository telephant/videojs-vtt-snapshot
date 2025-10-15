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
  SeekBar: VideoJSSeekBar;
}

interface VideoJSControlBar {
  progressControl: VideoJSProgressControl;
  ProgressControl: VideoJSProgressControl;
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
  private initPromise: Promise<void>;
  private rafPending: number | null = null;
  private lastMouseEvent: { event: MouseEvent; barRect: DOMRect } | null = null;

  constructor(player: Player, options: VideojsVttSnapshotOptions) {
    this.player = player;
    this.options = options;
    this.initPromise = this.initialize();
  }

  public async ready(): Promise<void> {
    return this.initPromise;
  }

  private get progressControl() {
    const controlBar = ((this.player as any).controlBar || (this.player as any).ControlBar) as VideoJSControlBar;
    const progressControl = controlBar.progressControl || controlBar.ProgressControl;
    return progressControl;
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
      throw error; // Re-throw to be caught by ready()
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
    if (!this.progressControl) return;

    if (!this.isValidProgressControl(this.progressControl)) return;

    this.progressControl.on('mousemove', this.handleMouseMove.bind(this));
    this.progressControl.on('mouseleave', this.handleMouseLeave.bind(this));
  }

  private isValidProgressControl(control: any): control is VideoJSProgressControl {
    const seekBar = control.seekBar || control.SeekBar;
    return control && 
            typeof control.el === 'function' && 
            typeof control.on === 'function' &&
            seekBar &&
            typeof seekBar.calculateDistance === 'function';
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.progressControl) return;

    if (!this.isValidProgressControl(this.progressControl)) return;

    const barRect = this.progressControl.el().getBoundingClientRect();
    
    // Store the latest mouse event
    this.lastMouseEvent = { event, barRect };

    // Schedule an update if one isn't already pending
    if (this.rafPending === null) {
      this.rafPending = requestAnimationFrame(() => this.updateSnapshot());
    }
  }

  private updateSnapshot(): void {
    this.rafPending = null;
    if (!this.lastMouseEvent) return;

    const { event } = this.lastMouseEvent;
    if (!this.isValidProgressControl(this.progressControl)) return;

    const barRect = this.progressControl.el().getBoundingClientRect();

    const seekBar = (this.progressControl.seekBar || this.progressControl.SeekBar);
    const percent = seekBar.calculateDistance(event);
    const mouseTime = this.player.duration() * percent;

    const cue = this.findClosestCue(mouseTime);
    if (cue) {
      const [src, coords] = this.parseVttCue(cue);
      let data: SnapshotData = { time: mouseTime, src, ...coords };

      if (this.options.beforeHovering) {
        const modified = this.options.beforeHovering(data);
        if (modified) data = modified;
      }

      this.showSnapshot(data, event, barRect);

      if (this.options.onHover) this.options.onHover(data);
    } else {
      this.hideSnapshot();
    }
  }

  private findClosestCue(time: number): VTTCue | null {
    if (!this.cues.length) return null;

    const duration = this.player.duration();
    if (!duration) return null;

    for (const cue of this.cues) {
      if (time >= cue.startTime && time < cue.endTime) {
        return cue;
      }
    }

    // fallback: closest cue
    let closestCue = this.cues[0];
    let minDistance = Math.abs(time - (closestCue.startTime + closestCue.endTime) / 2);

    for (let i = 1; i < this.cues.length; i++) {
      const cue = this.cues[i];
      const cueCenter = (cue.startTime + cue.endTime) / 2;
      const distance = Math.abs(time - cueCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCue = cue;
      }
    }
    return closestCue;
  }

  private handleMouseLeave(): void {
    // Cancel any pending animation frame
    if (this.rafPending !== null) {
      cancelAnimationFrame(this.rafPending);
      this.rafPending = null;
    }
    this.lastMouseEvent = null;
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
    let centerX = event.clientX - snapshotRect.width / 2;

    // check the bound of video container.
    const videoContainer = this.player.el().parentElement;
    if (videoContainer) {
      const videoContainerRect = videoContainer.getBoundingClientRect();
      if (
        centerX + data.w > videoContainerRect.width
        || centerX < 0
      ) {
        centerX = Math.max(0, Math.min(videoContainerRect.width - data.w, centerX));
      }
    }
    
    // Set the position and background
    Object.assign(this.snapshotElement.style, {
      display: 'block',
      position: 'absolute',
      left: `${centerX}px`,
      bottom: `${barRect.height + 60}px`, // 10px above the progress bar
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
    
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
      : `${pad(minutes)}:${pad(secs)}`;
  }

  // Public method to dispose the plugin
  dispose(): void {
    if (this.snapshotElement && this.snapshotElement.parentNode) {
      this.snapshotElement.parentNode.removeChild(this.snapshotElement);
    }
  }
}
