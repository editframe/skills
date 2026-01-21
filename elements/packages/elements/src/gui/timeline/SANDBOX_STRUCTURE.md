# Timeline Sandbox Structure

This document describes the atomic design structure of the timeline sandbox scenarios.

## Atomic Design Hierarchy

### Atoms (Basic Building Blocks)

**TrimHandles** (`TrimHandles.sandbox.ts`)
- Trim handle controls for adjusting start/end points
- Overlay visualization for trimmed regions
- Drag interaction for trim adjustment
- Event emission for trim changes

**TrackItem** (`tracks/TrackItem.sandbox.ts`)
- Individual track item representing a temporal element
- Element type icon display
- Element label display
- Positioning based on start time and duration
- Optional trim handles integration

### Molecules (Functional Groups)

**EFTimelineRuler** (`EFTimelineRuler.sandbox.ts`)
- Time markers and frame indicators
- Canvas-based rendering for performance
- FPS-aware frame display
- Duration and zoom coordination

### Organisms (Complex Components)

**EFTimelineRow** (`EFTimelineRow.sandbox.ts`)
- Complete row with label and track content
- Sticky label positioning
- Depth-based indentation
- Hover and selection states
- Integration of TrackItem with track-specific rendering
- Event emission for hover and selection

### Templates (Complete Interfaces)

**EFTimeline** (`EFTimeline.sandbox.ts`)
- Complete timeline interface
- Integration of all child components:
  - Header with playback and zoom controls
  - EFTimelineRuler for time display
  - Multiple EFTimelineRow instances
  - Playhead visualization
  - Scroll coordination
- State management and context provision
- Layout configuration options
- Element filtering capabilities

## Scenario Organization

Each sandbox file focuses on scenarios appropriate to its level:

### Atom Scenarios
- Component rendering with various props
- Visual appearance and styling
- Basic interactions (drag, click)
- Event emission
- Property updates

### Molecule Scenarios
- Component rendering with different configurations
- Integration of multiple atoms
- Coordinated behavior
- State synchronization

### Organism Scenarios
- Complex component rendering
- Integration of molecules and atoms
- User interaction flows
- State management
- Event handling and propagation

### Template Scenarios
- **Integration**: How components work together as a system
- **Coordination**: State propagation across all child components
- **Layout**: Different configuration options
- **State Management**: Context providers and state consistency
- **Filtering**: Element visibility and filtering
- **Error States**: Edge cases and graceful degradation

## Running Scenarios

Run all scenarios for a specific component:
```bash
./scripts/ef run TrimHandles
./scripts/ef run TrackItem
./scripts/ef run EFTimelineRuler
./scripts/ef run EFTimelineRow
./scripts/ef run EFTimeline
```

Run specific scenario patterns:
```bash
./scripts/ef run EFTimeline --scenario "*integration*"
./scripts/ef run EFTimeline --scenario "*zoom*"
./scripts/ef run TrimHandles --scenario "*drag*"
```

## Benefits of This Structure

1. **Focused Testing**: Each component has scenarios appropriate to its complexity level
2. **Reusability**: Atom and molecule scenarios can be referenced when debugging
3. **Maintainability**: Changes to a component only require updating its own sandbox
4. **Documentation**: The structure itself documents the component hierarchy
5. **Progressive Complexity**: Start with atoms, build up to complete system
6. **Isolation**: Test components in isolation before testing integration
7. **Clear Responsibilities**: Each level has well-defined testing concerns

## Component Dependencies

```
EFTimeline (Template)
├── Header Controls (built-in)
├── EFTimelineRuler (Molecule)
├── EFTimelineRow (Organism)
│   ├── Label (built-in)
│   └── TrackItem (Atom)
│       └── TrimHandles (Atom, optional)
└── Playhead (built-in)
```

## Future Additions

As new timeline components are added, they should follow this structure:

- **New Atoms**: Individual controls, handles, indicators
- **New Molecules**: Groups of atoms (e.g., a track type with multiple visual elements)
- **New Organisms**: Complex track types or row variants
- **New Templates**: Alternative timeline layouts or specialized timeline views
