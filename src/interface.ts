/**
 * Data object representing a thumbnail at a specific time
 */
export interface ThumbnailData {
  /** Image URL for the thumbnail */
  src: string;
  /** Optional sprite region in format "x,y,width,height" */
  xywh?: string;
  /** Current time in seconds */
  time: number;
}

/**
 * Configuration options for the VideojsVttSnapshot plugin
 */
export interface VideojsVttSnapshotOptions {
  /**
   * URL of the VTT file containing thumbnail information
   */
  vttUrl: string;

  /**
   * CSS class name to be added to the snapshot element
   * @default 'vjs-vtt-snapshot'
   */
  snapshotClass?: string;

  /**
   * Custom styles to be applied to the snapshot element
   */
  snapshotStyle?: Partial<CSSStyleDeclaration>;

  /**
   * Callback before showing the thumbnail
   */
  beforeHovering?: (data: SnapshotData) => SnapshotData | void;

  /**
   * Callback when hovering over a position
   */
  onHover?: (data: SnapshotData) => void;

  /**
   * Callback when mouse leaves the progress bar
   */
  onLeave?: () => void;
}

/**
 * Internal interface for parsed VTT cues
 */
export interface VTTCue {
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Cue text containing the image URL and optional sprite region */
  text: string;
}

export interface SnapshotData {
  time: number;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
} 