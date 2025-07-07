import { beforeAll, vi } from 'vitest';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

// Mock VTT content
export const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
sprite_001.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite_001.jpg#xywh=160,0,160,90
`;

export function createMockPlayer() {
  const mockPlayerEl = document.createElement('div');
  mockPlayerEl.className = 'video-js';
  mockPlayerEl.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    width: 400,
    height: 40,
    right: 400,
    bottom: 40,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));

  const eventHandlers: Record<string, EventListener> = {};

  // Create shared DOM elements
  const seekBarEl = document.createElement('div');
  seekBarEl.className = 'vjs-seek-bar';

  // Allow attaching event listeners
  seekBarEl.addEventListener = vi.fn((event: string, handler: EventListener) => {
    eventHandlers[event] = handler;
  });

  const mockSeekBar = {
    el: vi.fn(() => seekBarEl),
    calculateDistance: vi.fn(() => 0.5)
  };

  const progressControlEl = document.createElement('div');
  const mockProgressControl = {
    el: vi.fn(() => progressControlEl),
    on: vi.fn((event: string, handler: EventListener) => {
      eventHandlers[event] = handler;
    }),
    seekBar: mockSeekBar
  };

  const mockControlBar = {
    progressControl: mockProgressControl
  };

  const mockPlayer = {
    el: vi.fn(() => mockPlayerEl),
    controlBar: mockControlBar as any,
    duration: vi.fn(() => 100),
    ready: vi.fn(cb => cb()),
    one: vi.fn((event: string, handler: EventListener) => {
      eventHandlers[event] = handler;
    }),
    on: vi.fn((event: string, handler: EventListener) => {
      eventHandlers[event] = handler;
    }),
    isReady_: true
  } as unknown as Player;

  return {
    mockPlayer: mockPlayer as Player,
    mockPlayerEl,
    seekBarEl,
    eventHandlers
  };
}

export function getMockFetch() {
  return vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = input.toString();

    if (url === 'not-found.vtt') {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not Found')
      } as Response);
    }

    if (url === 'invalid.vtt') {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('Invalid VTT Content')
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockVttContent)
    } as Response);
  });
}

// Setup global mocks

beforeAll(() => {
  (global as any).videojs = videojs;

  document.body.classList.add('video-js');
});