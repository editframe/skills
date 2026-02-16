---
title: React Three Fiber Integration
description: Render 3D scenes with React Three Fiber in Editframe compositions
type: reference
nav:
  parent: "Advanced / 3D Integration"
  priority: 80
api:
  components:
    - name: OffscreenCompositionCanvas
      props:
        - name: worker
          type: Worker
          required: true
          description: Web worker that will handle R3F rendering
        - name: fallback
          type: React.ReactNode
          description: Fallback content for browsers without OffscreenCanvas support
        - name: containerStyle
          type: React.CSSProperties
          description: Extra styles for the container div
        - name: containerClassName
          type: string
          description: Extra className for the container div
        - name: canvasProps
          type: CanvasProps
          description: Canvas props to forward to R3F Canvas (shadows, dpr, gl, camera, scene, etc.)
    - name: CompositionCanvas
      props:
        - name: children
          type: React.ReactNode
          required: true
          description: R3F scene content
        - name: containerStyle
          type: React.CSSProperties
          description: Extra styles for the container div
        - name: containerClassName
          type: string
          description: Extra className for the container div
        - name: gl
          type: object
          description: WebGL renderer options (automatically includes preserveDrawingBuffer)
  hooks:
    - name: useCompositionTime
      signature: "useCompositionTime(): { timeMs: number; durationMs: number }"
      description: Hook to read current composition time inside an R3F scene
      returns: "{ timeMs, durationMs }"
  functions:
    - name: renderOffscreen
      signature: "renderOffscreen(children: React.ReactNode): void"
      description: Worker-side entry point for offscreen R3F rendering
      returns: void
---

# React Three Fiber Integration

Editframe provides first-class integration with React Three Fiber (R3F) for rendering 3D scenes in video compositions.

## Import

```tsx
import {
  CompositionCanvas,
  OffscreenCompositionCanvas,
  useCompositionTime
} from "@editframe/react/r3f";
```

## CompositionCanvas

Main-thread R3F canvas that automatically synchronizes with Editframe's timeline.

### Basic Usage

```tsx
import { Timegroup } from "@editframe/react";
import { CompositionCanvas, useCompositionTime } from "@editframe/react/r3f";
import { Box } from "@react-three/drei";

function RotatingBox() {
  const { timeMs } = useCompositionTime();
  const rotation = (timeMs / 1000) * Math.PI * 2; // Full rotation per second

  return (
    <Box rotation={[0, rotation, 0]}>
      <meshStandardMaterial color="orange" />
    </Box>
  );
}

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="5s" className="w-[1920px] h-[1080px]">
      <CompositionCanvas shadows>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <RotatingBox />
      </CompositionCanvas>
    </Timegroup>
  );
};
```

### Timeline Synchronization

`CompositionCanvas` automatically:
- Registers with parent `<Timegroup>` via `addFrameTask`
- Updates 3D scene on every frame
- Provides current time via `useCompositionTime()` hook
- Ensures deterministic frame-by-frame rendering

### useCompositionTime Hook

Access timeline position inside your 3D scene:

```tsx
function AnimatedSphere() {
  const { timeMs, durationMs } = useCompositionTime();
  const progress = timeMs / durationMs; // 0 to 1
  const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.5;

  return (
    <mesh scale={[scale, scale, scale]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}
```

**Returns:**
- `timeMs` - Current time in milliseconds (relative to this timegroup)
- `durationMs` - Total duration in milliseconds

### WebGL Configuration

Customize the Three.js renderer:

```tsx
<CompositionCanvas
  shadows
  gl={{
    antialias: true,
    alpha: true,
    // preserveDrawingBuffer is automatically set to true
  }}
  camera={{ position: [0, 0, 5], fov: 75 }}
  scene={{ background: new THREE.Color("#000000") }}
>
  {/* Scene content */}
</CompositionCanvas>
```

**Note:** `preserveDrawingBuffer: true` is automatically set for video export compatibility.

### Styling

The canvas fills its container absolutely:

```tsx
<Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px] bg-black">
  <CompositionCanvas
    containerClassName="rounded-lg"
    containerStyle={{ border: "2px solid white" }}
  >
    {/* Scene */}
  </CompositionCanvas>
</Timegroup>
```

## OffscreenCompositionCanvas

Renders R3F scene in a **web worker** using OffscreenCanvas for better performance and background-tab resilience.

### Worker Setup

Create a worker file:

```typescript
// scene-worker.ts
import { renderOffscreen, useCompositionTime } from "@editframe/react/r3f";
import { Box } from "@react-three/drei";

function Scene() {
  const { timeMs } = useCompositionTime();
  const rotation = (timeMs / 1000) * Math.PI;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Box rotation={[0, rotation, 0]}>
        <meshStandardMaterial color="cyan" />
      </Box>
    </>
  );
}

renderOffscreen(<Scene />);
```

### Component Usage

```tsx
import { Timegroup } from "@editframe/react";
import { OffscreenCompositionCanvas } from "@editframe/react/r3f";

const worker = new Worker(
  new URL('./scene-worker.ts', import.meta.url),
  { type: 'module' }
);

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px]">
      <OffscreenCompositionCanvas
        worker={worker}
        canvasProps={{ shadows: true, dpr: [1, 2] }}
        fallback={
          <div className="flex items-center justify-center w-full h-full">
            <p>OffscreenCanvas not supported</p>
          </div>
        }
      />
    </Timegroup>
  );
};
```

### Benefits

**Performance:**
- 3D rendering runs in separate thread
- Main thread stays responsive
- No blocking during heavy computation

**Background Tabs:**
- Worker continues rendering when tab is hidden
- Reliable video export in background
- No throttling from browser

**Architecture:**
- Zero-copy ImageBitmap transfer
- Efficient pixel pipeline
- Deterministic frame capture

### Browser Support

- **Chrome:** Full support
- **Firefox:** Full support
- **Edge:** Full support
- **Safari:** Not supported (use `fallback` prop)

Use the `fallback` prop to provide alternative content for Safari:

```tsx
<OffscreenCompositionCanvas
  worker={worker}
  fallback={
    <CompositionCanvas>
      <MyScene />
    </CompositionCanvas>
  }
/>
```

## Advanced: Complex Animations

### Particle System

```tsx
import { useRef, useEffect } from "react";
import { useCompositionTime } from "@editframe/react/r3f";
import * as THREE from "three";

function ParticleSystem() {
  const { timeMs, durationMs } = useCompositionTime();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const count = 1000;
    const dummy = new THREE.Object3D();
    const progress = timeMs / durationMs;

    for (let i = 0; i < count; i++) {
      const t = progress + (i / count) * 0.1;
      const angle = t * Math.PI * 2;
      const radius = 5 + Math.sin(t * 10) * 2;

      dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(t * 5) * 3,
        Math.sin(angle) * radius
      );
      dummy.rotation.set(t * Math.PI, t * Math.PI * 2, 0);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [timeMs, durationMs]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 1000]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="white" />
    </instancedMesh>
  );
}
```

### Camera Animation

```tsx
import { useThree } from "@react-three/fiber";
import { useCompositionTime } from "@editframe/react/r3f";
import { useEffect } from "react";

function CameraRig() {
  const { camera } = useThree();
  const { timeMs } = useCompositionTime();

  useEffect(() => {
    const t = timeMs / 1000;
    camera.position.x = Math.sin(t) * 5;
    camera.position.z = Math.cos(t) * 5;
    camera.lookAt(0, 0, 0);
  }, [timeMs, camera]);

  return null;
}
```

### Material Animation

```tsx
function AnimatedMaterial() {
  const { timeMs } = useCompositionTime();
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (!materialRef.current) return;
    const hue = (timeMs / 1000) % 1;
    materialRef.current.color.setHSL(hue, 1, 0.5);
  }, [timeMs]);

  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial ref={materialRef} />
    </mesh>
  );
}
```

## Integration with @react-three/drei

Use Drei helpers with Editframe:

```tsx
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { CompositionCanvas, useCompositionTime } from "@editframe/react/r3f";

function Scene() {
  const { timeMs } = useCompositionTime();

  return (
    <>
      <OrbitControls enableZoom={false} />
      <Environment preset="sunset" />
      <ContactShadows opacity={0.5} />

      <Box position={[0, Math.sin(timeMs / 500), 0]} />
    </>
  );
}

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px]">
      <CompositionCanvas>
        <Scene />
      </CompositionCanvas>
    </Timegroup>
  );
};
```

## Rendering to Video

3D scenes export to video like any other element:

```tsx
import { Timegroup } from "@editframe/react";
import { CompositionCanvas } from "@editframe/react/r3f";

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px]">
      <CompositionCanvas>
        {/* Your 3D scene */}
      </CompositionCanvas>
    </Timegroup>
  );
};

// Render with CLI
// npx editframe render ./src/Video.tsx
```

The integration ensures:
1. Synchronous frame-by-frame rendering
2. WebGL commands complete before capture (`gl.finish()`)
3. Deterministic output at any timeline position
4. Proper integration with Editframe's rendering pipeline

## When to Use Each Canvas

### Use CompositionCanvas when:
- Simple 3D scenes
- Safari support required
- Debugging (easier inspector access)
- Interactive preview with controls

### Use OffscreenCompositionCanvas when:
- Complex/heavy 3D computation
- Long render times
- Background tab rendering needed
- Multiple compositions at once

## Performance Tips

1. **Memoize scene components** to avoid unnecessary re-renders:
```tsx
const Scene = React.memo(() => {
  const { timeMs } = useCompositionTime();
  // ...
});
```

2. **Use instancing** for many identical objects:
```tsx
<instancedMesh args={[geometry, material, count]} />
```

3. **Limit geometry complexity** during rendering:
```tsx
<sphereGeometry args={[1, 16, 16]} /> {/* Lower segments */}
```

4. **Disable antialiasing** if not needed:
```tsx
<CompositionCanvas gl={{ antialias: false }}>
```

## Troubleshooting

### Scene appears black
**Problem:** Missing lights or incorrect camera setup.

**Solution:**
```tsx
<CompositionCanvas>
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} />
  {/* Your scene */}
</CompositionCanvas>
```

### Animation stutters during export
**Problem:** Animations using `useFrame` RAF loop.

**Solution:** Use `useCompositionTime()` instead:
```tsx
// ❌ Don't use useFrame for time-based animations
useFrame((state) => {
  mesh.rotation.y += 0.01;
});

// ✅ Use useCompositionTime
const { timeMs } = useCompositionTime();
mesh.rotation.y = timeMs / 1000;
```

### Worker fails to load
**Problem:** Incorrect worker URL or module type.

**Solution:**
```tsx
// ✅ Correct
const worker = new Worker(
  new URL('./worker.ts', import.meta.url),
  { type: 'module' }
);

// ❌ Wrong
const worker = new Worker('./worker.ts');
```

## Related

- [timegroup.md](timegroup.md) - Timeline container component
- [render-to-video.md](render-to-video.md) - Rendering compositions to video
- [scripting.md](scripting.md) - Programmatic element control
