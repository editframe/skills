# Scripting

Add dynamic JavaScript behavior to timegroups.

## Initializer

Set up behavior that runs once per instance (prime timeline and render clones).

### Basic Usage

```html
<ef-timegroup id="my-scene" mode="fixed" duration="5s">
  <div class="content"></div>
</ef-timegroup>

<script>
  const tg = document.querySelector('#my-scene');
  tg.initializer = (instance) => {
    // Runs once on prime timeline, once on each render clone
    console.log('Initializer running');
  };
</script>
```

### Constraints

- **Must be synchronous** - No async/await, no Promise return
- **Must complete quickly** - <100ms (error thrown) or <10ms (warning logged)
- **Register callbacks only** - Don't do expensive work in initializer

### Timing

- Set before connection: Runs after element connects to DOM
- Set after connection: Runs immediately
- Clones: Automatically copy and run initializer

## Frame Tasks

Register callbacks that execute on each frame during rendering.

### addFrameTask()

```javascript
const tg = document.querySelector('ef-timegroup');
tg.initializer = (instance) => {
  const cleanup = instance.addFrameTask((info) => {
    // Called on each frame
    // info contains: ownCurrentTimeMs, durationMs, percentComplete, etc.
  });
  
  // cleanup() removes the callback when called
};
```

### Callback Info

Frame task callbacks receive timing information:

```javascript
instance.addFrameTask((info) => {
  console.log(info.ownCurrentTimeMs);    // Current time in ms
  console.log(info.durationMs);          // Total duration
  console.log(info.percentComplete);     // 0-1 progress
});
```

### Multiple Callbacks

Register multiple frame tasks - they execute in parallel:

```javascript
tg.initializer = (instance) => {
  instance.addFrameTask((info) => {
    // Update text
  });
  
  instance.addFrameTask((info) => {
    // Update position
  });
};
```

## Examples

### Dynamic Text Updates

```html
<ef-timegroup id="counter" mode="fixed" duration="10s">
  <div class="text-4xl text-white counter-text"></div>
</ef-timegroup>

<script>
  const tg = document.querySelector('#counter');
  tg.initializer = (instance) => {
    instance.addFrameTask((info) => {
      const text = instance.querySelector('.counter-text');
      const seconds = (info.ownCurrentTimeMs / 1000).toFixed(2);
      text.textContent = `Time: ${seconds}s`;
    });
  };
</script>
```

### Procedural Animation

```html
<ef-timegroup id="animated" mode="fixed" duration="5s">
  <div class="box"></div>
</ef-timegroup>

<script>
  const tg = document.querySelector('#animated');
  tg.initializer = (instance) => {
    instance.addFrameTask((info) => {
      const box = instance.querySelector('.box');
      const progress = info.percentComplete;
      
      // Move box across screen
      box.style.transform = `translateX(${progress * 500}px)`;
      
      // Rotate based on time
      const rotation = (info.ownCurrentTimeMs / 10) % 360;
      box.style.transform += ` rotate(${rotation}deg)`;
    });
  };
</script>
```

### Data-Driven Content

```html
<ef-timegroup id="data-scene" mode="fixed" duration="8s">
  <div class="data-display"></div>
</ef-timegroup>

<script>
  const data = [
    { time: 0, value: 10 },
    { time: 2000, value: 25 },
    { time: 4000, value: 40 },
    { time: 6000, value: 60 },
  ];
  
  const tg = document.querySelector('#data-scene');
  tg.initializer = (instance) => {
    instance.addFrameTask((info) => {
      const display = instance.querySelector('.data-display');
      
      // Find current data point
      const current = data.find((d, i) => {
        const next = data[i + 1];
        return info.ownCurrentTimeMs >= d.time && 
               (!next || info.ownCurrentTimeMs < next.time);
      });
      
      if (current) {
        display.textContent = `Value: ${current.value}`;
      }
    });
  };
</script>
```

### Cleanup Pattern

```javascript
tg.initializer = (instance) => {
  // Set up resources
  const state = { count: 0 };
  
  const cleanup = instance.addFrameTask((info) => {
    state.count++;
    console.log(`Frame ${state.count}`);
  });
  
  // Cleanup is automatic when instance is removed
  // But you can manually cleanup if needed:
  // cleanup();
};
```

## Prime Timeline vs Render Clone

The initializer runs on both:

- **Prime timeline**: Interactive preview in browser
- **Render clone**: Headless rendering for video export

Same code runs in both contexts, ensuring consistent behavior.

```javascript
tg.initializer = (instance) => {
  // This code runs identically on prime timeline and render clones
  instance.addFrameTask((info) => {
    // Update content based on time
  });
};
```

## Best Practices

1. **Keep initializer fast** - Register callbacks, don't do heavy work
2. **Use frame tasks for updates** - All time-based logic goes in frame callbacks
3. **Avoid side effects** - Don't modify external state, keep logic contained
4. **Test in both contexts** - Preview in browser AND render to video
5. **Handle missing elements** - Check if elements exist before updating them

```javascript
// Good: Check before updating
instance.addFrameTask((info) => {
  const el = instance.querySelector('.my-element');
  if (el) {
    el.textContent = `Time: ${info.ownCurrentTimeMs}`;
  }
});

// Bad: Assumes element exists
instance.addFrameTask((info) => {
  instance.querySelector('.my-element').textContent = `Time: ${info.ownCurrentTimeMs}`;
});
```
