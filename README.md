# videojs-vtt-snapshot

A Video.js plugin that shows thumbnail previews when hovering over the progress bar. The thumbnails are defined in a VTT file and can use sprite sheets for better performance.

![Example](example/sprite_001.jpg)

## Installation

```bash
npm install videojs-vtt-snapshot
# or
pnpm add videojs-vtt-snapshot
# or
yarn add videojs-vtt-snapshot
```

## Quick Start

1. Add the plugin to your Video.js player:

```html
<script src="path/to/video.js"></script>
<script src="path/to/videojs-vtt-snapshot.js"></script>

<video id="my-video" class="video-js">
  <source src="my-video.mp4" type="video/mp4">
</video>

<script>
  const player = videojs('my-video', {
    plugins: {
      vttSnapshot: {
        vttUrl: 'path/to/thumbnails.vtt'
      }
    }
  });
</script>
```

2. Create a VTT file for your thumbnails (thumbnails.vtt):

```
WEBVTT

00:00:00.000 --> 00:00:05.000
sprite_001.jpg#xywh=0,0,160,90

00:00:05.000 --> 00:00:10.000
sprite_001.jpg#xywh=160,0,160,90
```

That's it! Now when you hover over the progress bar, you'll see thumbnail previews.

## API Reference

### Callbacks

#### beforeHovering(data: SnapshotData) => SnapshotData | void

Called before showing a thumbnail. Use this callback to:
- Modify the thumbnail source or position
- Load different quality thumbnails based on conditions
- Add authentication tokens to URLs
- Skip showing certain thumbnails

```javascript
{
  beforeHovering: (data) => {
    // Example 1: Load HD thumbnails for better quality
    return {
      ...data,
      src: data.src.replace('sprite_001.jpg', 'sprite_001_hd.jpg'),
      w: data.w * 2,
      h: data.h * 2
    };

    // Example 2: Add authentication token
    return {
      ...data,
      src: `${data.src}?token=${getAuthToken()}`
    };

    // Example 3: Skip thumbnail by returning void
    if (data.time < 10) {
      return; // Don't show thumbnails for first 10 seconds
    }
    return data;
  }
}
```

#### onHover(data: SnapshotData) => void

Called after the thumbnail is shown. Use this callback to:
- Track user behavior
- Update UI elements
- Trigger side effects

```javascript
{
  onHover: (data) => {
    // Example 1: Update chapter title
    updateChapterTitle(data.time);

    // Example 2: Track user interaction
    analytics.track('video_preview', {
      time: data.time,
      src: data.src
    });
  }
}
```

### Styling Options

#### snapshotClass: string

A custom CSS class for the thumbnail element. Use this to:
- Apply custom styles
- Add animations
- Override default appearance

```javascript
{
  snapshotClass: 'my-custom-snapshot'
}
```

```css
.my-custom-snapshot {
  border: 2px solid white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}
```

#### snapshotStyle: Partial<CSSStyleDeclaration>

Direct style object for the thumbnail element. Use this for:
- Dynamic styles
- Inline customization
- Quick prototyping

```javascript
{
  snapshotStyle: {
    border: '2px solid white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    transform: 'scale(1.1)'
  }
}
```

### Data Structure

#### SnapshotData

The data structure passed to callbacks:

```typescript
{
  // Current time position in seconds
  time: number;

  // URL of the sprite sheet or image
  src: string;

  // Sprite coordinates (in pixels)
  x: number;  // X position in sprite sheet
  y: number;  // Y position in sprite sheet
  w: number;  // Width of thumbnail
  h: number;  // Height of thumbnail
}
```

## VTT File Format

The VTT file should follow this format:
```
WEBVTT

[start time] --> [end time]
[image url]#xywh=[x],[y],[width],[height]
```

- Times are in HH:MM:SS.mmm format
- Image URL can be absolute or relative
- xywh defines the sprite coordinates and size
- Each cue represents a thumbnail in your video

## License

MIT 