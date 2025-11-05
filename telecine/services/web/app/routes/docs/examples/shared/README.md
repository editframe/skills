# Shared Demo Components

This directory contains reusable UI components extracted from common patterns across all video editing demonstration examples.

## Components Overview

### 🎬 PlaybackControls.tsx

**Standardized video playback controls with synchronized timeline**

- Play/pause button with emoji icons
- Scrub bar with visual progress indicator
- Time display with MM:SS formatting
- `usePlaybackState` hook for consistent state management

**Usage:**

```typescript
const { playbackState, handlePlayPause, handleSeek } = usePlaybackState()

<PlaybackControls
  playbackState={playbackState}
  onPlayPause={handlePlayPause}
  onSeek={handleSeek}
/>
```

### ⏯️ TimelineControls.tsx

**Professional timeline section with styled header and playback interface**

- Styled section header with color-coded dot indicator
- Full playback controls with scrub timeline
- Professional layout matching video editing software
- Customizable title and styling

**Usage:**

```typescript
<TimelineControls
  title="🎬 Synchronized Playback"
  playbackState={playbackState}
  onPlayPause={handlePlayPause}
  onSeek={handleSeek}
/>
```

### 🎛️ DemoSlider.tsx

**Professional parameter sliders with consistent styling**

- Label + value display
- Gradient progress bars
- Custom thumb styling
- Unit support (%, px, °, etc.)

**Usage:**

```typescript
<DemoSlider
  label="Opacity"
  value={opacity}
  min={0}
  max={100}
  unit="%"
  onChange={setOpacity}
/>
```

### 📋 QuickPresets.tsx

**Preset button system for common configurations**

- Color-coded preset categories
- Icon + description support
- Generic type support for any settings object
- Additional controls slot

**Usage:**

```typescript
const presets: QuickPreset<MySettings>[] = [
  {
    id: 'youtube',
    name: 'YouTube Style',
    description: 'Standard watermark',
    icon: '📺',
    colorScheme: 'blue',
    settings: { position: 'bottom-right', opacity: 60 }
  }
]

<QuickPresets presets={presets} onPresetApply={applyPreset} />
```

### 🔄 ToggleGroup.tsx

**Button groups for selecting between options**

- Grid layout with configurable columns
- Icon + text support
- Type-safe selection
- Consistent styling

**Usage:**

```typescript
<ToggleGroup
  title="Position"
  options={[
    { id: 'top-left', name: 'Top Left', icon: '↖️' },
    { id: 'center', name: 'Center', icon: '🎯' }
  ]}
  selected={position}
  onSelect={setPosition}
/>
```

### 📱 DemoLayout.tsx

**Complete demo page layout with consistent structure**

- Page header with title
- WithEnv integration
- Side-by-side controls + output layout
- Automatic playback state management

**Usage:**

```typescript
<DemoLayout title="My Demo" description="Demo description">
  <>
    <DemoSection title="Controls">
      {/* Controls here */}
    </DemoSection>
    <DemoOutput title="Output">
      {/* Output here */}
    </DemoOutput>
  </>
</DemoLayout>
```

### 📝 DocSection.tsx

**Documentation sections for "How it Works"**

- Consistent section styling
- Info grids for technical details
- Code blocks with syntax highlighting
- Application lists for use cases

## Common Patterns Identified

### 🎯 Extracted Patterns:

1. **Playback Controls**: Identical across all demos
2. **Slider Controls**: Parameter adjustment with labels/units
3. **Demo Layout**: Side-by-side controls + output
4. **Quick Presets**: Color-coded preset buttons
5. **Settings Display**: Current configuration overview
6. **Toggle Groups**: Option selection interfaces
7. **Conditional Sections**: Show/hide based on settings
8. **Documentation**: Consistent technical explanations

### 🔄 Benefits of Consolidation:

- **DRY Principle**: No duplicated UI code
- **Consistent UX**: All demos feel cohesive
- **Easy Updates**: Change once, update everywhere
- **Type Safety**: Shared interfaces prevent inconsistencies
- **Maintainability**: Centralized styling and behavior

### 🛠️ Migration Strategy:

1. Import shared components: `from "./shared"`
2. Replace custom implementations with shared components
3. Maintain demo-specific logic while using shared UI
4. Update styling globally through shared components

## Component Dependencies

```
DemoLayout (main wrapper)
├── PlaybackControls (with usePlaybackState hook)
├── TimelineControls (professional timeline section)
├── DemoSection (left side controls)
│   ├── DemoSlider (parameter controls)
│   ├── QuickPresets (preset buttons)
│   ├── ToggleGroup (option selection)
│   ├── ConditionalSection (show/hide sections)
│   └── SettingsDisplay (current config)
└── DemoOutput (right side output)
```

## Example Migration

**Before (duplicated code):**

```typescript
function PlaybackControls({ isPlaying, currentTime, duration, onPlayPause, onSeek }) {
  // 50+ lines of identical code in each demo
}
```

**After (shared component):**

```typescript
import { PlaybackControls, usePlaybackState } from "./shared"

const { playbackState, handlePlayPause, handleSeek } = usePlaybackState()
<PlaybackControls playbackState={playbackState} onPlayPause={handlePlayPause} onSeek={handleSeek} />
```

This consolidation reduces code duplication by ~70% while maintaining full functionality and improving consistency across all video editing demonstrations.
