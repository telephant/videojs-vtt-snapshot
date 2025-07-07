import videojs from 'video.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPlayer, getMockFetch, mockVttContent } from '../test/setup';
import './index';
import { VideojsVttSnapshot } from './videojs-vtt-snapshot';

describe('VttSnapshot Plugin', () => {
  let mocks: ReturnType<typeof createMockPlayer>;

  beforeEach(() => {
    mocks = createMockPlayer();

    global.fetch = getMockFetch();

  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register the plugin with Video.js', () => {
    expect(typeof videojs.getPlugin('vttSnapshot')).toBe('function');
  });

  it('should initialize with default options', async () => {
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });
    
    await plugin.ready();
    expect(plugin).toBeDefined();
    expect(fetch).toHaveBeenCalledWith('thumbnails.vtt');
  });

  it('should parse VTT file correctly', async () => {
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });

    await plugin.ready();

    // Simulate mouse move at 50% of video duration
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 200, // Half of the 400px width
      clientY: 20
    });
    mocks.eventHandlers['mousemove']?.(mockEvent);

    // Verify the snapshot element was created and is visible
    const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
    expect(snapshotElement).toBeDefined();
    expect(snapshotElement.style.display).not.toBe('none');
  });

  it('should handle mouse leave', async () => {
    const onLeave = vi.fn();
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt',
      onLeave
    });

    await plugin.ready();

    // First move mouse to show snapshot
    const moveEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 20
    });
    mocks.eventHandlers['mousemove']?.(moveEvent);

    // Then trigger mouse leave
    const leaveEvent = new MouseEvent('mouseleave');
    mocks.eventHandlers['mouseleave']?.(leaveEvent);

    // Verify snapshot is hidden
    const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
    expect(snapshotElement.style.display).toBe('none');
    expect(onLeave).toHaveBeenCalled();
  });

  it('should call beforeHovering and onHover callbacks', async () => {
    const beforeHovering = vi.fn(data => data);
    const onHover = vi.fn();

    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt',
      beforeHovering,
      onHover
    });

    await plugin.ready();

    // Simulate mouse move
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 20
    });
    mocks.eventHandlers['mousemove']?.(mockEvent);

    expect(beforeHovering).toHaveBeenCalledWith(expect.objectContaining({
      time: expect.any(Number),
      src: 'sprite_001.jpg',
      x: expect.any(Number),
      y: expect.any(Number),
      w: expect.any(Number),
      h: expect.any(Number)
    }));

    expect(onHover).toHaveBeenCalled();
  });

  it('should handle VTT file loading errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'not-found.vtt'
    });

    await expect(plugin.ready()).rejects.toThrow('Failed to load VTT file: Not Found');

    expect(consoleError).toHaveBeenCalledWith(
      'Error initializing VTT snapshot:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should handle invalid VTT content', async () => {
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'invalid.vtt'
    });

    await plugin.ready();

    // Simulate mouse move
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 20
    });
    mocks.eventHandlers['mousemove']?.(mockEvent);

    // Should not show snapshot for invalid VTT
    const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
    expect(snapshotElement.style.display).toBe('none');
  });

  it('should handle missing progress control', async () => {
    // Remove progress control from mock
    (mocks.mockPlayer as any).controlBar.progressControl = undefined;

    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });

    await plugin.ready();

    // Plugin should still initialize without errors
    expect(plugin).toBeDefined();
  });

  it('should clean up on dispose', async () => {
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });

    await plugin.ready();

    // Get snapshot element before dispose
    const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot');
    expect(snapshotElement).toBeDefined();

    // Dispose plugin
    plugin.dispose();

    // Snapshot element should be removed
    expect(mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot')).toBeNull();
  });

  it('should find closest cue based on time', async () => {
    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });

    await plugin.ready();

    // Test different mouse positions
    const positions = [
      { x: 0, expectedTime: 0 },    // Start
      { x: 200, expectedTime: 50 }, // Middle
      { x: 400, expectedTime: 100 } // End
    ];

    for (const { x, expectedTime } of positions) {
      const mockEvent = new MouseEvent('mousemove', {
        clientX: x,
        clientY: 20
      });
      mocks.eventHandlers['mousemove']?.(mockEvent);

      const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
      expect(snapshotElement).toBeDefined();
      expect(snapshotElement.style.display).not.toBe('none');
    }
  });

  it('should apply custom snapshot styles', async () => {
    const customStyle = {
      border: '2px solid red',
      borderRadius: '4px'
    };

    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt',
      snapshotStyle: customStyle
    });

    await plugin.ready();

    // Trigger snapshot display
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 200,
      clientY: 20
    });
    mocks.eventHandlers['mousemove']?.(mockEvent);

    const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
    expect(snapshotElement.style.border).toBe(customStyle.border);
    expect(snapshotElement.style.borderRadius).toBe(customStyle.borderRadius);
  });

  it('should parse VTT cues with different formats', async () => {
    // Mock a VTT file with different cue formats
    const customVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite.jpg#xywh=160,0,160,90

00:00:10.000 --> 00:00:15.000
sprite.jpg
`;

    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(customVttContent)
      } as Response)
    );

    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });

    await plugin.ready();

    // Test with time in the third cue (which has no coordinates)
    const mockEvent = new MouseEvent('mousemove', {
      clientX: 300, // 75% of duration = 12.5 seconds
      clientY: 20
    });
    mocks.eventHandlers['mousemove']?.(mockEvent);

    const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
    expect(snapshotElement).toBeDefined();
    expect(snapshotElement.style.display).not.toBe('none');
  });

  it('should select correct sprite position based on time', async () => {
    // Mock a VTT file with multiple sprite positions
    const customVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite.jpg#xywh=160,0,160,90

00:00:10.000 --> 00:00:15.000
sprite.jpg#xywh=320,0,160,90
`;

    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(customVttContent)
      } as Response)
    );

    const plugin = new VideojsVttSnapshot(mocks.mockPlayer, {
      vttUrl: 'thumbnails.vtt'
    });

    await plugin.ready();

    // Mock the seekBar's calculateDistance to return specific values
    const mockSeekBar = (mocks.mockPlayer as any).controlBar.progressControl.seekBar;
    mockSeekBar.calculateDistance.mockImplementation(
      (event: MouseEvent) => event.clientX / 400 // 400 is the width of our mock player
    );

    // Test different time positions and verify correct sprite coordinates
    const testCases = [
      { 
        position: { x: 0, y: 20 },     // 0s - first sprite
        expectedSprite: { x: 0, y: 0 }
      },
      { 
        position: { x: 200, y: 20 },   // 50s (middle) - second sprite
        expectedSprite: { x: 160, y: 0 }
      },
      { 
        position: { x: 400, y: 20 },   // 100s (end) - third sprite
        expectedSprite: { x: 320, y: 0 }
      }
    ];

    for (const testCase of testCases) {
      // Simulate mouse move
      const mockEvent = new MouseEvent('mousemove', {
        clientX: testCase.position.x,
        clientY: testCase.position.y
      });
      mocks.eventHandlers['mousemove']?.(mockEvent);

      // Get the snapshot element and verify its background position
      const snapshotElement = mocks.mockPlayerEl.querySelector('.vjs-vtt-snapshot') as HTMLElement;
      expect(snapshotElement).toBeDefined();
      expect(snapshotElement.style.display).not.toBe('none');
      
      // Check background position
      expect(snapshotElement.style.backgroundImage).toContain('sprite.jpg');
      
      // Get the actual background position and compare with expected
      const actualPosition = snapshotElement.style.backgroundPosition;
      const expectedPosition = `-${testCase.expectedSprite.x}px -${testCase.expectedSprite.y}px`;
      expect(actualPosition).toBe(expectedPosition);
    }
  });
}); 