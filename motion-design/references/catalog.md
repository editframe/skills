---
name: catalog
description: Full motion catalog study cards with problem, solution, and build recipe.
---

# Motion Catalog

Each card is generated from the current checkout's motion catalog JSON.
Choose a study by the problem it solves. Adapt the recipe to the brief.
Preview: `https://editframe.com/motion/studies/{id}`.

## Typography

### Word Slot (`slot-machine-ticker`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/slot-machine-ticker
- Source: `references/examples/slot-machine-ticker.tsx`

**Problem.** Crossfading successive words obscures their relationship and gives each state no physical continuity.

**Solution.** Move one continuous strip through a fixed mask. Hold each word, preload in the opposite direction, advance by exactly one cell, and settle. A repeated first cell makes the loop continuous.

**Build.**

1. Stack MAKE, MOVE, LOOP, and a repeated MAKE in equal 1.15em cells.
2. Mask the strip to one cell and hold the first word for 600ms.
3. Preload downward by .045em over 240ms, then lift to the next cell over 540ms.
4. Overshoot by .03em and settle for 240ms. Hold before the next advance.
5. Repeat the same cadence twice more. End on the duplicated first cell so the loop joins cleanly.

**Forces.**

- Keep all cells the same height.
- Each word needs a readable hold.
- The first and last visible cells must match.

**Related.** `incremental-title-states`, `ticker-marquee`, `word-split-title-reveal`

### Letter Rearrangement (`word-split-title-reveal`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/word-split-title-reveal
- Source: `references/examples/word-split-title-reveal.tsx`

**Problem.** A crossfade hides letter identity; straight crossing paths make the moving letters overlap.

**Solution.** Keep the outside letters fixed while the middle pair trade places on opposing arcs. A small counter-move prepares each swap; a restrained overshoot settles the new word.

**Build.**

1. Place FORM in four fixed slots. Keep F and M still throughout.
2. Hold for 900ms, then move O and R slightly away from their destinations over 300ms.
3. Move the letters onto separate upper and lower arcs, trading horizontal slots over 1.08s.
4. Settle a small overshoot over 300ms, then hold FROM long enough to read it.
5. Reverse the swap with a shorter 840ms travel, settle, and hold FORM through the loop seam.

**Forces.**

- Establish the first word before moving it.
- Separate crossing letters vertically.
- Hold both readable states and match the loop endpoints.

**Related.** `kinetic-type-poster`, `slot-machine-ticker`

### Elastic Tracking (`kinetic-type-poster`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/kinetic-type-poster
- Source: `references/examples/kinetic-type-poster.tsx`

**Problem.** An entrance animation does not demonstrate how changing the space between letters alters the rhythm of a word.

**Solution.** Compress the spacing slightly, release into a wider word, overshoot once, then settle. Hold the expanded word before a shorter return to its original spacing.

**Build.**

1. Center a word in equal-width letter slots. Offset each letter relative to the word’s center.
2. Hold for 600ms, then compress spacing for 300ms.
3. Expand over 720ms with a quick release and a slow landing. Overshoot the final spacing by 10%.
4. Settle through a 2% correction, then hold the expanded word long enough to read.
5. Add a small outward preparation, return to the original spacing, and rest before repeating.

**Forces.**

- Keep letterforms legible while changing their spacing.
- Reserve room for the widest spread.
- Anticipation should be smaller and slower than the release.

**Related.** `caption-safe-reflow`, `word-split-title-reveal`, `type-outline-echo`, `word-stagger-reveal`

### Outline Type Echo (`type-outline-echo`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/type-outline-echo
- Source: `references/examples/type-outline-echo.tsx`

**Problem.** Repeated text becomes clutter when every copy has equal weight or unrelated motion.

**Solution.** The solid word leads a downward preparation and release. Five outlined copies follow at 60ms intervals, fan upward, hold, then converge. The original silhouette returns before the loop boundary.

**Build.**

1. Stack five outlined copies behind one solid word. Keep decreasing opacity on the distant layers.
2. Hold the readable word, then dip it 1.2cqw to prepare the upward release.
3. Delay successive outlines by 60ms, with 2.2cqw spacing between their destinations.
4. Release quickly, pass the destination by .6cqw, then settle into the fan.
5. Hold, converge the outlines back onto the word, and finish every layer before the loop ends.

**Forces.**

- The solid word must remain the strongest shape.
- Stroke thickness must survive small previews.
- Reserve headroom for the farthest outline.

**Related.** `type-as-window`, `kinetic-type-poster`, `ticker-marquee`

### Glyph Foundry (`glyph-foundry`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/glyph-foundry
- Source: `references/examples/glyph-foundry.tsx`

**Problem.** Letterforms should emerge from a visible construction system.

**Solution.** Line modules assemble MESH, hold its silhouette, then reorganize into a lattice.

**Build.**

1. Construct a modular alphabet from independent line segments.
2. Move modules from their lattice positions into letters, preserving identity.
3. Hold the word, then return the modules to the lattice.

**Related.** `baseline-orbit`, `contour-current`, `letter-gait`

### Baseline Orbit (`baseline-orbit`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/baseline-orbit
- Source: `references/examples/baseline-orbit.tsx`

**Problem.** Type needs to travel along a changing curve without losing its spacing.

**Solution.** A repeated phrase circulates along a baseline that changes from a wide ellipse to a tall loop.

**Build.**

1. Build a closed curve and measure its arc length.
2. Place letters at equal distances, oriented to the local tangent.
3. Coordinate the curve deformation with one complete circuit.

**Related.** `orbital-armillary`, `glyph-foundry`, `contour-current`, `letter-gait`

### Contour Current (`contour-current`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/contour-current
- Source: `references/examples/contour-current.tsx`

**Problem.** A word should become a moving material while remaining recognizable at key moments.

**Solution.** Horizontal slices of DRIFT flow out of alignment and reconstruct the word at a new position.

**Build.**

1. Clip a word into horizontal bands.
2. Pull back briefly, then send a staggered current through the bands.
3. Reconstruct and hold the word before the return current.

**Related.** `contour-slice-volume`, `glyph-foundry`, `baseline-orbit`, `letter-gait`

### Letter Gait (`letter-gait`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/letter-gait
- Source: `references/examples/letter-gait.tsx`

**Problem.** Lettering should perform an action through its own structure.

**Solution.** Articulated letter strokes shift their weight through a coordinated gait.

**Build.**

1. Construct letters from hinged typographic strokes.
2. Alternate planted contacts and lifted strokes with visible weight transfer.
3. Return every hinge to its starting pose for the loop.

**Related.** `lagging-linkage`, `glyph-foundry`, `baseline-orbit`, `contour-current`

### Axis Duet (`axis-duet`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/axis-duet
- Source: `references/examples/axis-duet.tsx`

**Problem.** Letter proportions should change the relationship between two words.

**Solution.** Two custom words exchange width and stroke weight inside a fixed typographic field.

**Build.**

1. Draw original letter geometry with independent width and weight.
2. Let one word occupy the space yielded by the other.
3. Hold both extremes and return through a shared rhythm.

**Related.** `glyph-foundry`, `baseline-orbit`, `contour-current`

### Trace Memory (`trace-memory`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/trace-memory
- Source: `references/examples/trace-memory.tsx`

**Problem.** Drawing a word should expose the order and character of its strokes.

**Solution.** A custom monoline word accumulates stroke by stroke, retains a weighted trace, then erases.

**Build.**

1. Draw an original monoline alphabet.
2. Reveal each stroke along its path with overlapping starts.
3. Let the completed trace persist before erasing to the opening state.

**Related.** `glyph-foundry`, `baseline-orbit`, `contour-current`

### Chromatic Type Window (`type-as-window`)

- Scale: part
- Preview: https://editframe.com/motion/studies/type-as-window
- Source: `references/examples/type-as-window.tsx`

**Problem.** Animating the entire word undermines legibility; a static color fill can make large typography feel inert.

**Solution.** Keep the letterforms fixed while a color field travels inside them. Give the texture a short rest at each turnaround; the type remains the stable mask throughout.

**Build.**

1. Set oversized letterforms with transparent fill and a clipped repeating color field.
2. Reserve the initial 10% of the loop as a brief rest.
3. Move the field smoothly to the opposite position by 45%, then hold until 55%.
4. Return to the exact starting position at 100%. Keep both lines on the same clock.

**Forces.**

- Thin strokes cannot hold a complex texture.
- The fill must retain contrast with the background throughout its travel.
- The text and its layout stay stationary.

**Related.** `type-outline-echo`, `editorial-wordmark-hook`

### Masked Word Stagger (`word-stagger-reveal`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/word-stagger-reveal
- Source: `references/examples/word-stagger-reveal.tsx`

**Problem.** Revealing a headline all at once removes its rhythm; fading every word independently makes the sentence feel disconnected.

**Solution.** A short baseline cue prepares the reveal. Words lift through fixed masks in two phrase-level beats, settle with a restrained overshoot, hold for reading, then leave in a quicker stagger.

**Build.**

1. Typeset the final phrase with fixed line breaks and descender clearance.
2. Draw the baseline cue during the first 384ms.
3. Start the four word lifts at 400, 520, 850, and 1040ms. The longer gap separates the two phrase groups.
4. Give each lift 700ms: move quickly, overshoot the baseline by 3%, then settle.
5. Hold the complete phrase long enough to read. Exit each word over 400ms with 60ms offsets, leaving a quiet loop gap.

**Forces.**

- The masks must not cut off descenders.
- Stagger sets reading pace; longer phrases need smaller delays.
- Line breaks must be designed for each aspect.

**Related.** `caption-fade-up`, `title-fade`, `editorial-title-sequence`

### Typewriter (`typewriter`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/typewriter
- Source: `references/examples/typewriter.tsx`

**Problem.** Uniform character timing feels mechanical and ignores the pauses between words and punctuation.

**Solution.** Establish a caret, type in short word-shaped bursts, pause before punctuation, then hold the sentence. Erase more quickly than the typing and return to the empty caret.

**Build.**

1. Reserve a fixed monospace line width so the layout does not shift.
2. Let the caret wait for 600ms before the first character.
3. Use 80ms character intervals within words, with longer gaps between words and before punctuation.
4. Move the caret exactly one character with every reveal. Hold the complete sentence.
5. Erase in 13 steps over 500ms and rest on the initial caret until the loop ends.

**Related.** `typewriter-brief`, `word-stagger-reveal`

### Counter-running Marquee (`ticker-marquee`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/ticker-marquee
- Source: `references/examples/ticker-marquee.tsx`

**Problem.** A single scrolling line often feels like a news ticker; inconsistent speeds or visible seams break the illusion of endless motion.

**Solution.** Stack three oversized bands and reverse the middle band. Duplicate each band exactly and move the track by half its total width on a linear loop. A slight common rotation gives the stack a poster-like crop.

**Build.**

1. Create a repeat unit containing a short phrase and a separator, with all spacing inside the unit.
2. Place two identical units in a width-max-content flex track.
3. Animate the track from 0 to -50% over eight seconds with linear easing; reverse only the middle row.
4. Invert the middle band colors and rotate the complete stack by five degrees.
5. Check the first and last frames for a seamless join. Keep labels outside the moving stack.

**Forces.**

- Both duplicated units must have identical width.
- Ease curves create visible speed changes at the seam.
- A cropped moving phrase is acceptable, but the visual hierarchy must remain clear.

**Related.** `kinetic-type-poster`, `type-outline-echo`

### Classic Subtitle (`caption-classic-subtitle`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-classic-subtitle
- Source: `references/examples/caption-classic-subtitle.tsx`

**Problem.** Readers need a complete phrase that stays steady while the image continues.

**Solution.** Show a balanced two-line caption on a compact dark backing; replace it as a whole at each phrase boundary.

**Build.**

1. Break each phrase at a natural reading boundary.
2. Keep the position and type size fixed across cues.
3. Use exact cue cuts and leave intentional gaps empty.

**Related.** `caption-word-highlight`, `caption-karaoke-fill`, `caption-word-pop`, `caption-paint-on`, `caption-transcript-rollup`

### Word Highlight (`caption-word-highlight`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-word-highlight
- Source: `references/examples/caption-word-highlight.tsx`

**Problem.** A full caption provides context, but the spoken word needs a clear focus.

**Solution.** Keep the phrase in place while a contrasting rounded highlight follows the active word.

**Build.**

1. Reserve the same padding around every word so highlighting never reflows text.
2. Turn the highlight on at each word start and off at its end.
3. Clear the highlight during speech gaps, then replace the entire phrase.

**Related.** `caption-classic-subtitle`, `caption-karaoke-fill`, `caption-word-pop`, `caption-paint-on`, `caption-transcript-rollup`

### Karaoke Fill (`caption-karaoke-fill`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-karaoke-fill
- Source: `references/examples/caption-karaoke-fill.tsx`

**Problem.** Readers need to follow progress inside a word without losing the rest of the line.

**Solution.** Sweep a second text color through each word over its own duration, retaining the completed fill.

**Build.**

1. Place a colored copy exactly over each base word.
2. Animate a clipping edge from left to right between that word’s start and end.
3. Retain completed words until the phrase ends, then reset with the next cue.

**Related.** `caption-classic-subtitle`, `caption-word-highlight`, `caption-word-pop`, `caption-paint-on`, `caption-transcript-rollup`

### Word Pop (`caption-word-pop`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-word-pop
- Source: `references/examples/caption-word-pop.tsx`

**Problem.** A short spoken phrase needs a strong focal beat with each word.

**Solution.** Show one bold outlined word at a time, with a brief scale overshoot and a stable reading hold.

**Build.**

1. Use actual word timestamps rather than an equal stagger.
2. Keep every word centered and size for the longest word.
3. Arrive in 230ms, then hold until the next word or phrase end.

**Related.** `caption-classic-subtitle`, `caption-word-highlight`, `caption-karaoke-fill`, `caption-paint-on`, `caption-transcript-rollup`

### Paint-on Caption (`caption-paint-on`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-paint-on
- Source: `references/examples/caption-paint-on.tsx`

**Problem.** A sentence should build with speech while leaving earlier words available to read.

**Solution.** Reveal words at their timestamps in a reserved two-line layout, retaining every word through the phrase.

**Build.**

1. Lay out the complete phrase before it starts.
2. Switch each word from hidden to visible at its start without moving adjacent words.
3. Hold the completed sentence and clear at the cue boundary.

**Related.** `caption-classic-subtitle`, `caption-word-highlight`, `caption-karaoke-fill`, `caption-word-pop`, `caption-transcript-rollup`

### Transcript Roll-up (`caption-transcript-rollup`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-transcript-rollup
- Source: `references/examples/caption-transcript-rollup.tsx`

**Problem.** Continuous narration needs recent context without an ever-growing transcript.

**Solution.** Add each new caption below the previous one and roll the oldest line out of a two-row window.

**Build.**

1. Reserve a fixed-height window for two caption rows.
2. Roll the new row in over 200ms while the earlier row moves up.
3. Retain a speaker label and dim the previous row; clear the window after the final hold.

**Related.** `caption-classic-subtitle`, `caption-word-highlight`, `caption-karaoke-fill`, `caption-word-pop`, `caption-paint-on`

### Manim Write & Transform (`manim-write-transform`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/manim-write-transform
- Source: `references/examples/manim-write-transform.tsx`

**Problem.** Changing an equation can lose the identity of its terms and obscure the reasoning.

**Solution.** Write serif glyph outlines into solid text, preserve colored terms across transformations, and hold each equivalent equation long enough to read.

**Build.**

1. Draw each glyph contour with a small stagger, then fill its letterform.
2. Keep matching terms as persistent objects; move the constant on an arc while changing its operator.
3. Simplify, display division on both sides, then frame the result. Pause between operations.

**Related.** `trace-memory`, `word-split-title-reveal`, `glyph-foundry`

## Layouts

### Lower Third Anchor (`lower-third-anchor`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/lower-third-anchor
- Source: `references/examples/lower-third-anchor.tsx`

**Problem.** Identify a subject without obscuring the main action.

**Solution.** A lower third establishes an identity inside safe margins, holds while the scene continues, then withdraws.

**Build.**

1. Reserve a quiet area of the scene and safe outer margins.
2. Introduce the supporting graphic before the two-level identity.
3. Hold the label through the action, then clear it in reverse order.

**Related.** `caption-safe-reflow`, `split-panel-handoff`, `tracked-callout-overlay`

### Split Panel Handoff (`split-panel-handoff`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/split-panel-handoff
- Source: `references/examples/split-panel-handoff.tsx`

**Problem.** Two subjects need to share the frame while their hierarchy changes.

**Solution.** A shared divider reallocates space between information and imagery, preserving continuity through the handoff.

**Build.**

1. Give both panels a shared edge and clear roles.
2. Move the divider while adapting each panel’s content.
3. Pause at each allocation so the new hierarchy reads.

**Related.** `comparison-scan`, `lower-third-anchor`, `tracked-callout-overlay`

### Tracked Callout Overlay (`tracked-callout-overlay`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/tracked-callout-overlay
- Source: `references/examples/tracked-callout-overlay.tsx`

**Problem.** An annotation must remain attached to a moving subject without covering it.

**Solution.** A leader follows the subject while the annotation stays in a quiet region of the frame.

**Build.**

1. Separate the moving anchor from the stable information block.
2. Connect them with a leader whose endpoints track both regions.
3. Reveal the annotation after the anchor, then remove it before the subject resets.

**Related.** `inset-focus-relay`, `lower-third-anchor`, `split-panel-handoff`

### Inset Focus Relay (`inset-focus-relay`)

- Scale: part
- Preview: https://editframe.com/motion/studies/inset-focus-relay
- Source: `references/examples/inset-focus-relay.tsx`

**Problem.** A detail needs emphasis without losing the larger scene.

**Solution.** An inset magnifies successive details while the full composition remains visible.

**Build.**

1. Keep a persistent context view with a clearly identified focus area.
2. Magnify the same artwork in a separate inset.
3. Transfer the focus area and magnified view together, then hold each detail.

**Related.** `grid-card-zoom`, `tracked-callout-overlay`

### Comparison Scan (`comparison-scan`)

- Scale: part
- Preview: https://editframe.com/motion/studies/comparison-scan
- Source: `references/examples/comparison-scan.tsx`

**Problem.** A comparison should reveal differences without making the viewer mentally align two images.

**Solution.** A divider scans between two registered states of the same composition.

**Build.**

1. Author both states in the same coordinate system.
2. Clip them at one shared divider so landmarks remain aligned.
3. Pause at representative comparisons, then restore the initial view.

**Related.** `color-block-wipe`, `split-panel-handoff`

### Editorial Mosaic Reflow (`editorial-mosaic-reflow`)

- Scale: part
- Preview: https://editframe.com/motion/studies/editorial-mosaic-reflow
- Source: `references/examples/editorial-mosaic-reflow.tsx`

**Problem.** Several pieces of content must change hierarchy without losing their identity.

**Solution.** Persistent tiles reorganize from an equal grid into a hero-led editorial layout.

**Build.**

1. Keep each tile’s content and identity stable.
2. Reallocate the tiles’ positions and dimensions as one coordinated layout.
3. Hold the hierarchy before returning to the equal grid.

**Related.** `pressure-field`, `unit-regrouping`, `card-deck-fan-to-grid`

### Caption-safe Reflow (`caption-safe-reflow`)

- Scale: part
- Preview: https://editframe.com/motion/studies/caption-safe-reflow
- Source: `references/examples/caption-safe-reflow.tsx`

**Problem.** Captions need a readable zone without covering the subject.

**Solution.** The scene reallocates space at phrase boundaries to reserve a stable caption area.

**Build.**

1. Establish the scene before introducing a short caption.
2. Move or resize the subject to create a quiet reading zone.
3. Keep the caption steady through its phrase, then return the scene after it clears.

**Related.** `lower-third-anchor`, `kinetic-type-poster`

## Shape & rhythm

### Orbital Phase Lock (`orbital-phase-lock`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/orbital-phase-lock
- Source: `references/examples/orbital-phase-lock.tsx`

**Problem.** Independent moving elements look arbitrary unless the viewer can perceive the relationship between their periods.

**Solution.** Bring independent orbital phases into alignment, move the aligned group together, then release it.

**Build.**

1. Establish distinct phases.
2. Converge on one radial axis and sustain a shared quarter turn.
3. Separate into the starting phases for a continuous loop.

**Related.** `orbital-armillary`, `stroke-dash-draw`, `wave-interference-field`

### Wave Interference Field (`wave-interference-field`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/wave-interference-field
- Source: `references/examples/wave-interference-field.tsx`

**Problem.** A dense line texture feels static when its complexity has no visible cause.

**Solution.** Emit graphic wave fronts from two fixed sources so their overlaps move across a shared field.

**Build.**

1. Keep source positions stable and offset front spacing between sources.
2. Expand rings at a steady rate.
3. Recycle fronts beyond the clipped edge; this is a graphic overlap pattern, not a numerical interference simulation.

**Related.** `pressure-field`, `volumetric-wave`, `orbital-phase-lock`, `staggered-tile-cascade`

### Metaball Coalescence (`metaball-coalescence`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/metaball-coalescence
- Source: `references/examples/metaball-coalescence.tsx`

**Problem.** Separate forms should merge into a continuous material.

**Solution.** Moving masses form connecting necks, coalesce, and separate through a continuous contour.

**Build.**

1. Arrange a small group of simple masses.
2. Create a shared contour that joins nearby surfaces.
3. Vary their distance to alternate distinct bodies and one connected form.

**Related.** `shape-morph-loop`, `elastic-snap`

### Impulse Relay (`impulse-relay`)

- Scale: part
- Preview: https://editframe.com/motion/studies/impulse-relay
- Source: `references/examples/impulse-relay.tsx`

**Problem.** One movement should visibly cause the next rather than sharing a preset stagger.

**Solution.** Contact passes an impulse through a chain of bodies, with each response beginning at the collision.

**Build.**

1. Establish separated bodies and a readable incoming motion.
2. Time each transfer to physical contact, then let the struck body carry the next action.
3. Allow the final response to settle before the deliberate reset.

**Related.** `elastic-snap`, `staggered-tile-cascade`

### Lagging Linkage (`lagging-linkage`)

- Scale: part
- Preview: https://editframe.com/motion/studies/lagging-linkage
- Source: `references/examples/lagging-linkage.tsx`

**Problem.** Secondary motion should follow the leading action while connected parts remain joined.

**Solution.** An anchored articulated chain changes direction; delayed segment rotations create overlapping follow-through.

**Build.**

1. Keep a fixed anchor and a continuous chain of joints.
2. Drive the leading segment, then delay and attenuate the rotations of successive segments.
3. Let the distal segments recover after the leader has arrived.

**Related.** `letter-gait`, `shape-morph-loop`

### Pressure Field (`pressure-field`)

- Scale: part
- Preview: https://editframe.com/motion/studies/pressure-field
- Source: `references/examples/pressure-field.tsx`

**Problem.** A focal change should affect its surrounding composition through local relationships.

**Solution.** A persistent tile field yields around a moving pressure source, then recovers as the source passes.

**Build.**

1. Establish an ordered field and a distinct focal form.
2. Derive local displacement from proximity so neighboring elements respond together.
3. Restore the field behind the source while preserving every tile identity.

**Related.** `editorial-mosaic-reflow`, `wave-interference-field`

### Weightless Bob (`weightless-bob`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/weightless-bob
- Source: `references/examples/weightless-bob.tsx`

**Problem.** A stationary object has no perceived weight; a uniform up-and-down tween feels mechanical.

**Solution.** Pair a slow, eased vertical drift with a shadow that widens and fades as the object rises. Keep the travel small enough to preserve its silhouette.

**Build.**

1. Place an object above a separate soft ground shadow.
2. Move the object through one smooth up-and-down cycle with matching start and end poses.
3. Widen and fade the blurred shadow at the top of the arc.
4. Use a slight counter-rotation to keep the object from feeling rigid.

**Related.** `elastic-snap`, `orbital-phase-lock`

### Staggered Tile Cascade (`staggered-tile-cascade`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/staggered-tile-cascade
- Source: `references/examples/staggered-tile-cascade.tsx`

**Problem.** A modular field arriving all at once hides its construction and rhythm.

**Solution.** Pass a local deformation through a persistent tile grid, pause, then send a second impulse in the opposite direction.

**Build.**

1. Preserve every tile throughout the study.
2. Delay compression and lift by grid diagonal.
3. Let the field settle, then reverse the propagation order.

**Related.** `impulse-relay`, `volumetric-wave`, `color-block-wipe`, `wave-interference-field`

### Pixel Converge (`pixel-converge`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/pixel-converge
- Source: `references/examples/pixel-converge.tsx`

**Problem.** An identity or structure needs an arrival with a clear change from disorder to order.

**Solution.** Resolve visible fragments into a regular grid through an ordered assembly front.

**Build.**

1. Assign unique scattered positions within the frame.
2. Gather fragments by diagonal with a shared arrival hold.
3. Preserve color and identity while dispersing in reverse order.

**Related.** `voxel-regrouping`, `staggered-tile-cascade`, `wave-interference-field`

### Elastic Snap (`elastic-snap`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/elastic-snap
- Source: `references/examples/elastic-snap.tsx`

**Problem.** A perfectly linear scale change has no sense of stored energy or material.

**Solution.** Compress a soft form between two pads, release the pressure, and let diminishing recoil restore its contour.

**Build.**

1. Establish contact between the pads and the resting form.
2. Compress with reciprocal horizontal and vertical scale.
3. Withdraw the pads before recoil; return them after the form rests.

**Related.** `impulse-relay`, `shape-morph-loop`, `circular-bloom-wipe`

### Shape Morph Loop (`shape-morph-loop`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/shape-morph-loop
- Source: `references/examples/shape-morph-loop.tsx`

**Problem.** Switching between disconnected shapes loses the sense that one form is changing its material state.

**Solution.** Propagate contour changes through nested forms, giving each silhouette time to read.

**Build.**

1. Offset each layer inside the composition duration.
2. Hold clear geometric poses after propagation completes.
3. Restore every circle before the loop boundary.

**Related.** `lagging-linkage`, `elastic-snap`, `circular-bloom-wipe`

## Transitions

### Match Cut Relay (`match-cut-relay`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/match-cut-relay
- Source: `references/examples/match-cut-relay.tsx`

**Problem.** A cut between unrelated scenes should preserve the viewer’s visual focus.

**Solution.** A central disc carries a graphic match cut through three different visual contexts.

**Build.**

1. Choose a silhouette and focal position shared by every scene.
2. Establish each context around the unchanged focal geometry.
3. Cut directly between contexts and give each one a reading interval.

**Related.** `color-block-wipe`, `circular-bloom-wipe`

### Circular Bloom Wipe (`circular-bloom-wipe`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/circular-bloom-wipe
- Source: `references/examples/circular-bloom-wipe.tsx`

**Problem.** A cut separates two visual worlds. How can a small focal point become the next entire frame?

**Solution.** Concentric clipping fronts reveal a radial composition, hold it, then contract into the original orbit.

**Build.**

1. Register both compositions around the same center.
2. Expand layered circular fronts beyond the frame corners.
3. Hold the destination, then reverse the layered reveal.

**Related.** `horizontal-panel-wipe`, `shape-morph-loop`

### Horizontal Panel Wipe (`horizontal-panel-wipe`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/horizontal-panel-wipe
- Source: `references/examples/horizontal-panel-wipe.tsx`

**Problem.** A dissolve blurs the relationship between two graphic states. A moving seam can make the replacement legible.

**Solution.** Staggered horizontal strips assemble a second composition at the same coordinates.

**Build.**

1. Divide the destination into three registered strips.
2. Slide strips in with a short phase offset and hold the continuous image.
3. Clear the strips in their original travel direction to recover the source.

**Related.** `color-block-wipe`, `circular-bloom-wipe`

### Color Block Wipe (`color-block-wipe`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/color-block-wipe
- Source: `references/examples/color-block-wipe.tsx`

**Problem.** A transition can feel anonymous when it has no graphic relationship to the composition.

**Solution.** A stable silhouette spans changing palette blocks, preserving focus through the wipe.

**Build.**

1. Keep a fixed central motif across all blocks.
2. Use a deliberate three-beat arrival cadence.
3. Hold the palette, then clear columns in reverse order.

**Related.** `comparison-scan`, `horizontal-panel-wipe`, `staggered-tile-cascade`

### Whip Pan (`whip-pan`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/whip-pan
- Source: `references/examples/whip-pan.tsx`

**Problem.** A simple cut disconnects adjacent scenes, but a slow camera move drains their momentum.

**Solution.** Move between two registered compositions with a short camera impulse and still reading intervals.

**Build.**

1. Establish the first composition around a stable focal center.
2. Accelerate the shared scene strip and concentrate blur around travel.
3. Hold the destination before a separate return impulse.

**Related.** `horizontal-panel-wipe`, `color-block-wipe`

### Cut on Action (`cut-on-action`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/cut-on-action
- Source: `references/examples/cut-on-action.tsx`

**Problem.** A viewpoint change must preserve the motion the viewer is following.

**Solution.** Cut from a front view to an oblique view at the pendulum’s vertical crossing; preserve its phase and screen-space contact point.

**Build.**

1. Use one analytic swing phase for both viewpoints.
2. Cut twice, each time the bob passes the shared vertical.
3. Change projection and setting without restarting the action.

**Related.** `match-cut-relay`

### Temporal Dissolve (`temporal-dissolve`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/temporal-dissolve
- Source: `references/examples/temporal-dissolve.tsx`

**Problem.** A scene needs to convey elapsed time through a visible overlap.

**Solution.** Dissolve a daytime landscape into its nighttime counterpart while preserving the horizon.

**Build.**

1. Compose two fully opaque scenes around a shared horizon.
2. Blend complete frames across a 1.4s overlap.
3. Hold the destination before a second dissolve returns to the opening.

**Related.** `match-cut-relay`

### Shared-object Morph (`shared-object-morph`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/shared-object-morph
- Source: `references/examples/shared-object-morph.tsx`

**Problem.** A change of setting needs a recognizable object to carry attention.

**Solution.** An authored ribbon contour widens and bends into a river as its setting changes.

**Build.**

1. Define corresponding vertices on a single closed contour.
2. Interpolate position, width, curvature, and color through the handoff.
3. Introduce the new context while preserving the contour, then reverse for the loop.

**Related.** `shape-morph-loop`

### Foreground Object Wipe (`foreground-object-wipe`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/foreground-object-wipe
- Source: `references/examples/foreground-object-wipe.tsx`

**Problem.** A scene change needs to be motivated by something moving inside the composition.

**Solution.** A large foreground sail carries a matching reveal edge from the harbor to open water.

**Build.**

1. Build two complete harbor compositions.
2. Tie the incoming clip boundary to the foreground sail’s leading geometry.
3. Move the sail fully beyond the frame before holding the destination.

**Related.** `horizontal-panel-wipe`

### Luma Contour Reveal (`luma-contour-reveal`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/luma-contour-reveal
- Source: `references/examples/luma-contour-reveal.tsx`

**Problem.** A reveal needs spatial ordering beyond a straight traveling edge.

**Solution.** Threshold a fixed grayscale relief map to replace a terrain plate with its inverse view.

**Build.**

1. Generate a deterministic grayscale relief map.
2. Sweep a luminance threshold with a narrow soft boundary.
3. Apply the resulting alpha to the complete incoming frame and hold the endpoint.

**Related.** `circular-bloom-wipe`

### Liquid Scene Flow (`liquid-scene-flow`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/liquid-scene-flow
- Source: `references/examples/liquid-scene-flow.tsx`

**Problem.** Organic scenes need a transition whose boundary participates in their movement.

**Solution.** An uneven flowing front reveals a second warm sculptural composition.

**Build.**

1. Author a broad wave with a smaller secondary ripple.
2. Move it beyond both frame edges so neither endpoint exposes a seam.
3. Use a slower handoff and a still interval before the return.

**Related.** `circular-bloom-wipe`

### Paper Tear Reveal (`paper-tear-reveal`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/paper-tear-reveal
- Source: `references/examples/paper-tear-reveal.tsx`

**Problem.** Editorial artwork needs a tactile scene handoff.

**Solution.** A ragged paper edge advances in held steps between two botanical layouts.

**Build.**

1. Create a deterministic torn silhouette with two irregularity scales.
2. Advance its position in discrete steps; keep the edge attached to the matte.
3. Reveal a different page layout and hold it before returning.

**Related.** `horizontal-panel-wipe`

### Pixel Scene Replacement (`pixel-scene-replacement`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/pixel-scene-replacement
- Source: `references/examples/pixel-scene-replacement.tsx`

**Problem.** Digital scenes need discrete replacement rather than another object assembly.

**Solution.** Replace full-frame cells in a deterministic order between two terminal compositions.

**Build.**

1. Divide both scenes into the same cell grid.
2. Use a fixed hash to rank cell replacement.
3. Keep every cell occupied by either source or destination throughout the handoff.

**Related.** `pixel-converge`

### Card Flip Transition (`card-flip-transition`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/card-flip-transition
- Source: `references/examples/card-flip-transition.tsx`

**Problem.** A mosaic needs to reveal a different image through surface turnover.

**Solution.** A diagonal wave of orthographic tile rotations turns one poster into another.

**Build.**

1. Divide both complete posters into corresponding tiles.
2. Stagger Y-axis rotation by row and column; swap front and back at edge-on.
3. Apply restrained shading and return every tile to a flat registered image.

**Related.** `horizontal-panel-wipe`

### Band Smear Handoff (`band-smear-handoff`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/band-smear-handoff
- Source: `references/examples/band-smear-handoff.tsx`

**Problem.** A graphic scene change needs to carry directional distortion through the edit.

**Solution.** Horizontal image bands stretch and shift while the next typographic scene takes over.

**Build.**

1. Sample fixed horizontal strips from the outgoing scene.
2. Stretch and offset strips near the midpoint, wrapping coverage beyond the frame.
3. Blend the incoming scene through the same deformation and settle it clear.

**Related.** `whip-pan`

### Displacement Handoff (`displacement-handoff`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/displacement-handoff
- Source: `references/examples/displacement-handoff.tsx`

**Problem.** A material scene change needs a continuous distortion rather than a flat cover.

**Solution.** A traveling horizontal displacement field bends two complete views through their overlap.

**Build.**

1. Use a sinusoidal displacement field over narrow horizontal strips.
2. Wrap the image to maintain coverage and crossfade at peak deformation.
3. Return displacement to zero before the destination reading interval.

**Related.** `zoom-blast`

## Camera & depth

### Tunnel Seal Rush (`tunnel-seal-rush`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/tunnel-seal-rush
- Source: `references/examples/tunnel-seal-rush.tsx`

**Problem.** An opener that fades from black has no velocity. A tunnel without sequenced objects is a screensaver.

**Solution.** Grow phase-offset frames from a vanishing point while sparse seal changes punctuate forward travel.

**Build.**

1. Repeat expanding frames with evenly offset phases.
2. Hold three seal states long enough to distinguish them.
3. Match the periodic field and final seal to the opening.

### Hexagon 2D to 3D (`hexagon-2d-to-3d`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/hexagon-2d-to-3d
- Source: `references/examples/hexagon-2d-to-3d.tsx`

**Problem.** Jumping from a diagram to an unrelated 3D object breaks visual continuity.

**Solution.** Tilt a flat diagram before separating its planes, then collapse depth before returning to the flat view.

**Build.**

1. Establish one planar silhouette.
2. Lead with the camera tilt; stagger the separation of parallel planes.
3. Hold the depth relationship, compress the planes, then complete the camera return.

**Related.** `orbital-phase-lock`, `shape-morph-loop`

### Zoom Blast (`zoom-blast`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/zoom-blast
- Source: `references/examples/zoom-blast.tsx`

**Problem.** A fast camera transition should preserve a focal point and resolve into a readable destination.

**Solution.** Accelerate through a focal aperture into a second registered composition, then pull back for the loop.

**Build.**

1. Establish the aperture and the larger surrounding composition.
2. Enlarge the opening rapidly while a delayed rotation settles the destination.
3. Hold the revealed scene, then pull back to the opening composition.

**Related.** `whip-pan`

### Scroll Flicks (`scroll-flicks`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/scroll-flicks
- Source: `references/examples/scroll-flicks.tsx`

**Problem.** A smooth scroll is a tween. Discrete flicks with pauses are a person.

**Solution.** Alternate short and longer inertial scrolls with reading pauses and a deliberate return.

**Build.**

1. Fit the list viewport to the final content position.
2. Flick one row, two rows, then one row with a synchronized scrollbar.
3. Pause between gestures and return smoothly to the opening position.

## 3D

### Exploded Volume (`exploded-volume`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/exploded-volume
- Source: `references/examples/exploded-volume.tsx`

**Problem.** The structure inside a solid is hidden by its assembled silhouette.

**Solution.** A solid separates into volumetric parts and reassembles while perspective and lighting preserve their relationship.

**Build.**

1. Build the volume from independently positioned solid components.
2. Separate them along their structural axes.
3. Hold the exploded view, then reassemble the original volume.

**Related.** `contour-slice-volume`, `orbiting-sculpture`, `hinged-cube-net`

### Orbiting Sculpture (`orbiting-sculpture`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/orbiting-sculpture
- Source: `references/examples/orbiting-sculpture.tsx`

**Problem.** A complex form cannot be understood from one viewpoint.

**Solution.** A camera travels around a sculptural mesh, revealing its volume through changing overlap and illumination.

**Build.**

1. Construct one continuous mesh in three-dimensional space.
2. Orbit the camera while preserving the object’s scale and center.
3. Light and depth-sort the faces, returning to the initial view.

**Related.** `exploded-volume`, `hinged-cube-net`

### Hinged Cube Net (`hinged-cube-net`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/hinged-cube-net
- Source: `references/examples/hinged-cube-net.tsx`

**Problem.** The relationship between a flat net and a solid should remain visible.

**Solution.** Six connected faces fold around shared hinges into a cube, then unfold into the same net.

**Build.**

1. Lay out a connected six-face net.
2. Rotate each face around its shared edge, inheriting parent hinge motion.
3. Hold the closed volume, then unfold along the same edges.

**Related.** `exploded-volume`, `orbiting-sculpture`

### Spatial Wave (`volumetric-wave`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/volumetric-wave
- Source: `references/examples/volumetric-wave.tsx`

**Problem.** A timing wave should reveal the depth and continuity of a spatial field.

**Solution.** A phase wave travels through a three-dimensional field of anchored columns.

**Build.**

1. Build a regular field of solid columns.
2. Offset column extension by position so a visible wave travels across the field.
3. Use a stable camera and lighting to reveal depth without competing with the phase motion.

**Related.** `staggered-tile-cascade`, `wave-interference-field`

### Orbital Armillary (`orbital-armillary`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/orbital-armillary
- Source: `references/examples/orbital-armillary.tsx`

**Problem.** Orbital alignment should remain intelligible when paths occupy different planes.

**Solution.** Solid rings and orbiting bodies pass through depth and converge into a recurring alignment.

**Build.**

1. Place the orbital paths in distinct spatial planes.
2. Coordinate their periods around a shared phase relationship.
3. Use perspective and occlusion to reveal which paths pass in front.

**Related.** `orbital-phase-lock`, `baseline-orbit`

### Contour Slice Volume (`contour-slice-volume`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/contour-slice-volume
- Source: `references/examples/contour-slice-volume.tsx`

**Problem.** A volume’s cross-sections should remain recognizable while its silhouette deforms.

**Solution.** Stacked solid cross-sections shear apart and recover the original sculptural volume.

**Build.**

1. Construct a continuous silhouette from solid cross-sections.
2. Propagate displacement through successive slices.
3. Hold a legible deformed silhouette, then rebuild the starting form.

**Related.** `contour-current`, `exploded-volume`

### Voxel Regrouping (`voxel-regrouping`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/voxel-regrouping
- Source: `references/examples/voxel-regrouping.tsx`

**Problem.** A spatial quantity should change arrangement without changing its membership.

**Solution.** Stable colored voxels move from one interleaved volume into distinct populations.

**Build.**

1. Give every unit a persistent color and identity.
2. Move the same voxels into separate spatial populations.
3. Hold the grouped volumes so their proportions can be compared, then return.

**Related.** `unit-regrouping`, `pixel-converge`

## Lines & data

### Stroke Draw Chart (`stroke-draw-chart`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/stroke-draw-chart
- Source: `references/examples/stroke-draw-chart.tsx`

**Problem.** A fully visible chart presents too much information at once and gives its endpoint no emphasis.

**Solution.** Establish quiet grid lines, draw the illustrative trend in time order, then introduce the endpoint annotation as the line finishes arriving.

**Build.**

1. Use a restrained grid to establish the chart scale.
2. Normalize the trend path with pathLength=1.
3. Animate stroke-dashoffset from 1 to 0 with a measured ease.
4. Draw the trend from 0.42 to 2.76 seconds; introduce the endpoint after arrival. Hold the complete chart, then fade the annotation before clearing the line for the loop.

**Related.** `stroke-dash-draw`, `progress-ring-fill`

### Unit Regrouping (`unit-regrouping`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/unit-regrouping
- Source: `references/examples/unit-regrouping.tsx`

**Problem.** Aggregate quantities should preserve their underlying units.

**Solution.** Sixty persistent dots regroup into populations of twenty, twenty-five, and fifteen.

**Build.**

1. Keep one stable shape for each unit and color for each population.
2. Move the interleaved units into proportional groups.
3. Introduce totals once the populations settle, then return the same units.

**Related.** `voxel-regrouping`, `editorial-mosaic-reflow`, `proportional-flow`, `stroke-draw-chart`, `progress-ring-fill`

### Proportional Flow (`proportional-flow`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/proportional-flow
- Source: `references/examples/proportional-flow.tsx`

**Problem.** A divided quantity should retain its total and relative proportions.

**Solution.** A band representing sixty units divides into flows of twenty, twenty-five, and fifteen.

**Build.**

1. Give every unit the same band thickness.
2. Connect the source subdivisions to their destinations with continuous ribbons.
3. Reveal the flow before its totals, then hold the complete relationship.

**Related.** `unit-regrouping`, `stroke-draw-chart`, `progress-ring-fill`

### Progress Ring Fill (`progress-ring-fill`)

- Scale: part
- Preview: https://editframe.com/motion/studies/progress-ring-fill
- Source: `references/examples/progress-ring-fill.tsx`

**Problem.** Numbers alone make relative proportions hard to compare at a glance.

**Solution.** Draw concentric arcs from a shared origin. Use consistent stroke widths and stagger the fills so the viewer can follow one measure at a time.

**Build.**

1. Place concentric track circles around a common center.
2. Rotate the group so each arc starts at twelve o’clock.
3. Normalize the path length and animate the visible dash from zero to its target proportion.
4. Stagger the three 1.6-second fills by 250ms. Hold the final illustrative proportions of 82%, 64%, and 43% for comparison.

**Related.** `stroke-draw-chart`, `orbital-phase-lock`

### Underline Draw Accent (`underline-draw-accent`)

- Scale: part
- Preview: https://editframe.com/motion/studies/underline-draw-accent
- Source: `references/examples/underline-draw-accent.tsx`

**Problem.** A bolded phrase is emphasis. A drawn underline is an event on that phrase.

**Solution.** SVG path under the phrase. stroke-dashoffset 100% → 0 after the text is up.

**Build.**

1. Measure phrase width.
2. Path = that width.
3. Draw 300–400ms.

### Editorial Rule Draw (`rule-draw`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/rule-draw
- Source: `references/examples/rule-draw.tsx`

**Problem.** A static divider can look arbitrary; drawing it before the title lands steals attention from the heading.

**Solution.** Reveal the chapter heading first, then scale a full-width hairline from the reading edge. A small caption follows the rule, creating an ordered headline → line → detail sequence.

**Build.**

1. Design the final title page with a large two-line serif heading and one accent color.
2. Fade and lift the heading over 600ms.
3. Start the rule after 500ms and draw it from scaleX(0) to scaleX(1) over 1.1s.
4. Reveal the short supporting line at 1.4s and hold the full page.

**Forces.**

- Animate transform, not width, to preserve the surrounding layout.
- The rule should connect the heading and caption visually.
- Use a fine line with enough contrast at thumbnail size.

**Related.** `editorial-wordmark-hook`, `editorial-title-sequence`

### Stroke Dash Draw (`stroke-dash-draw`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/stroke-dash-draw
- Source: `references/examples/stroke-dash-draw.tsx`

**Problem.** A contour visible from the first frame conceals the gesture that created it.

**Solution.** Draw nested architectural arches as consecutive continuous traces; one warm line becomes the focal accent.

**Build.**

1. Use a single continuous path for each contour and normalize each path with pathLength=1.
2. Set stroke-dasharray to 1; animate stroke-dashoffset from 1 to 0.
3. Stagger adjacent contours by 110ms to expose the construction without making nine separate focal points.
4. Hold the finished drawing, then continue dashoffset toward -1 to erase in the direction of travel.

**Related.** `orbital-phase-lock`, `staggered-tile-cascade`

## Focus & interaction

### Interface Typing (`focus-interface-typing`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-interface-typing
- Source: `references/examples/focus-interface-typing.tsx`

**Problem.** A typed label can read as a title reveal unless the viewer sees an editable field and a response.

**Solution.** Type a proportional query with a synchronized caret. Narrow results as the query becomes specific, then hold the matching document with its workspace context.

**Build.**

1. Show an empty search field and three page rows.
2. Focus the field, then type Roadmap with uneven character timing.
3. Keep the caret at the end of each complete character.
4. After a brief pause, remove unrelated rows and hold the matching result.

### Cursor Path (`focus-cursor-path`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-cursor-path
- Source: `references/examples/focus-cursor-path.tsx`

**Problem.** A cursor crossing a busy interface is easy to lose; a permanent trail competes with its destination.

**Solution.** Guide a small cursor across a populated launch plan toward View settings. End the brief trail on arrival and let a quiet hover reveal the control’s purpose.

**Build.**

1. Hold the cursor away from the control.
2. Make the main approach in 0.84 seconds, followed by a 0.21-second correction.
3. Anchor the tip at the target; keep the arrow rigid.
4. Reveal hover and tooltip after arrival, while the motion emphasis disappears.

### Click Confirmation (`focus-click-confirmation`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-click-confirmation
- Source: `references/examples/focus-click-confirmation.tsx`

**Problem.** A decorative click ring does not show whether an action worked.

**Solution.** Copy a visible page URL from a share dialog. Follow contact and release with a durable copied state, while keeping ownership and access clear.

**Build.**

1. Approach quickly and finish with a small correction.
2. Pause before pressing; move the control down slightly while the pointer stays rigid.
3. Pulse once at the exact hotspot and confirm after release.
4. Move the cursor aside while the result remains readable.

### Collaborative Cursors (`focus-collaborative-cursors`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-collaborative-cursors
- Source: `references/examples/focus-collaborative-cursors.tsx`

**Problem.** Multiple pointers become visual noise when ownership and contribution are unclear.

**Solution.** Identify two collaborators by stable names and colors. Let them complete distinct layout and copy reviews independently, then confirm the shared result.

**Build.**

1. Give each collaborator a stable name and color.
2. Mira approaches Layout, pauses, reviews and moves aside.
3. Noah starts later and completes Copy on a different rhythm.
4. Show the shared completion after both panels visibly record their review.

### Drag & Drop (`focus-drag-and-drop`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-drag-and-drop
- Source: `references/examples/focus-drag-and-drop.tsx`

**Problem.** A translating card does not communicate a drag unless pickup, targeting and drop have visible consequences.

**Solution.** Grab a page section by its handle, make neighboring rows move as it passes, and settle the new order before confirming it was saved.

**Build.**

1. Approach the handle and pause before pickup.
2. Change to a grabbing hand; lift the card without moving the hotspot off its handle.
3. Move neighboring rows individually as the dragged card crosses them.
4. Release, settle into the final slot and move the pointer aside.

### Chat Turn-Taking (`focus-chat-turn-taking`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-chat-turn-taking
- Source: `references/examples/focus-chat-turn-taking.tsx`

**Problem.** Chat animation can confuse composition, sending, waiting and answering when all messages simply appear.

**Solution.** Compose a request, visibly send it, and distinguish waiting from word-by-word delivery. Hold a concrete answer and its source long enough to read.

**Build.**

1. Type the request at an uneven cadence.
2. Enable send when composition is complete, then clear the input as the user bubble arrives.
3. Hold a distinct waiting state before the answer.
4. Reveal complete word groups with a pause between lines, then hold for reading.

### Pan + Zoom (`focus-pan-zoom`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-pan-zoom
- Source: `references/examples/focus-pan-zoom.tsx`

**Problem.** Magnification loses meaning when the viewer cannot connect a close-up to the original interface.

**Solution.** Follow the general-access control into a close-up, show the dropdown choice and saved result, then return to the same page with the changed value intact.

**Build.**

1. Establish page details and the existing general-access setting.
2. Approach the access control, then move the camera into a readable close-up.
3. Open the dropdown, select Only invited people, and hold the saved result.
4. Return to the same page overview with the changed value intact.

### Contrast Isolation (`focus-contrast-isolation`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-contrast-isolation
- Source: `references/examples/focus-contrast-isolation.tsx`

**Problem.** A dense interface gives unrelated regions equal visual priority.

**Solution.** Dim the surrounding preferences while keeping type size bright. Change its slider and preview together, then restore context with the new value preserved.

**Build.**

1. Establish the two reading-preference controls.
2. Dim context and preserve a bright type-size panel.
3. Move the size control and show the text preview grow.
4. Restore the full interface while preserving the new value.

### Selective Blur (`focus-selective-blur`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-selective-blur
- Source: `references/examples/focus-selective-blur.tsx`

**Problem.** A focus effect becomes a transition gimmick when it obscures the target or moves the interface unnecessarily.

**Solution.** Keep spacing sharp while it changes, transfer sharpness before changing type size, then restore both completed adjustments to full clarity.

**Build.**

1. Establish both reading-preference controls.
2. Keep spacing sharp as its setting changes.
3. Transfer sharpness to type size before its value changes.
4. Restore both panels to sharp focus with both adjustments preserved.

## —

### Social Ad Spine (`social-ad-spine`)

- Scale: composition
- Preview: https://editframe.com/motion/studies/social-ad-spine
- Source: `references/examples/social-ad-spine.tsx`

**Problem.** A social ad that is only a hero shot feels like a still; one that is only a logo feels like a bumper. The viewer needs a spine that runs from hook to lockup.

**Solution.** Build the film as Hook → Hero → Proof well → Range → Offer → Lockup. Keep overlap uniform. Reuse the same product-bob and well-frame motifs so the spine reads as one material.

**Build.**

1. Hook: wordmark or badge, one motion.
2. Hero: product push-in, price, bob.
3. Proof: framed video well and/or spec chips.
4. Range: grid, cycle, or montage of variants.
5. Offer: bundle slam.
6. Lockup: mark + URL + one ring or pill.

**Forces.**

- Open on the hook or the thumb keeps moving
- Product must be seen as an object, then as a life
- Offer and lockup have to land without a hard sales cut

### Product Demo Documentary (`product-demo-documentary`)

- Scale: composition
- Preview: https://editframe.com/motion/studies/product-demo-documentary
- Source: `references/examples/product-demo-documentary.tsx`

**Problem.** A UI recreation without a camera plan is a screen recording. A camera plan without a documentary spine is a random zoom.

**Solution.** Open on a tool surface (terminal, editor, canvas). Walk one task with cursor, type, and camera punches. Cut to a short title or tagline, then a quiet lockup.

**Build.**

1. Establish the tool chrome.
2. One task, one focus at a time: type, click, follow.
3. Optional mid-film title.
4. Lockup. No new information.

**Forces.**

- The viewer must believe this is the real product
- Attention must be steered; the whole window cannot move at once
- The end card has to feel earned, not slapped on

### Launch Montage (`launch-montage`)

- Scale: composition
- Preview: https://editframe.com/motion/studies/launch-montage
- Source: `references/examples/launch-montage.tsx`

**Problem.** A launch that only shows UI feels small. A launch that only shows type feels empty. The film has to alternate proof and name.

**Solution.** Montage of proof scenes (metric table, chart, diagram, comparison) with short type beats between them. End on name + availability, not another UI shot.

**Build.**

1. Claim or wordmark open.
2. 2–4 proof scenes: table, chart, flow, comparison.
3. Name type-on.
4. Availability line + lockup.

**Forces.**

- Metrics need time to be read
- Diagrams need a build order
- The product name should appear once, late, then hold

### Character Brand Film (`character-brand-film`)

- Scale: composition
- Preview: https://editframe.com/motion/studies/character-brand-film
- Source: `references/examples/character-brand-film.tsx`

**Problem.** A lockup that never performs is a still. A mascot performance that never becomes a wordmark is a cartoon with no brand.

**Solution.** Let the character do one physical act (stack, flip, bounce), then isolate the hero mark and slide the wordmark in. Do not extract the physics tables; extract the spine.

**Build.**

1. Cast or mark enters and performs.
2. Headline or feature line.
3. Mark-to-wordmark lockup.

**Forces.**

- Character motion is expensive to parameterize
- The mark must still read as the brand at the end

### Agent Workflow Reel (`agent-workflow-reel`)

- Scale: composition
- Preview: https://editframe.com/motion/studies/agent-workflow-reel
- Source: `references/examples/agent-workflow-reel.tsx`

**Problem.** Agent demos turn into identical typing. The viewer needs phases: brief, work, artifact — not a log.

**Solution.** Three phases. Brief (type + send). Work (checklist, log, or feed). Artifact (card, PR, screen row). Camera punches stay inside one surface until the artifact scene.

**Build.**

1. Brief: typewriter + send click.
2. Work: checklist or streaming log.
3. Artifact: generated screens, PR, or published card.

**Forces.**

- Work must look like work (logs, checks, feed)
- The artifact must appear as a new object
- Chrome cannot change identity mid-film

### Editorial Title Sequence (`editorial-title-sequence`)

- Scale: composition
- Preview: https://editframe.com/motion/studies/editorial-title-sequence
- Source: `references/examples/editorial-title-sequence.tsx`

**Problem.** A single title card has no progression; a montage of unrelated type styles feels like separate films.

**Solution.** Build three chapters: a serif proposition, a contrasting oversized invitation, and a warm concluding title. Retain identical margins across clean cuts so palette and typographic contrast provide the progression.

**Build.**

1. Opening: reveal an italic serif title through line masks on an ivory field, followed by a drawn rule.
2. Middle: cut to dark green and oversized sans type; outline the second line to change emphasis without adding imagery.
3. Closing: cut to terracotta and settle a two-line serif title through tracking and scale.
4. Reserve at least two seconds in every chapter for reading; preview before and after both cuts.

**Forces.**

- The sequence needs contrast without losing its visual identity.
- Chapter titles need time to be read after the entrance finishes.
- All formats need deliberate line breaks and stable safe margins.

**Related.** `kinetic-type-poster`, `type-outline-echo`

### Hook Hero Proof Offer Lockup (`hook-hero-proof-offer-lockup`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/hook-hero-proof-offer-lockup
- Source: `references/examples/hook-hero-proof-offer-lockup.tsx`

**Problem.** Without a shared order, every social ad invents a new structure and the catalog cannot reuse scenes.

**Solution.** Use this order unless there is a reason not to. Swap content, not structure.

**Build.**

1. Hook (wordmark / badge).
2. Hero (product push-in).
3. Proof (well and/or specs).
4. Range (optional).
5. Offer.
6. Lockup.

**Forces.**

- The sequence opens on a hook
- Hero before lifestyle
- Offer before URL

### Terminal Tagline Lockup (`terminal-tagline-lockup`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/terminal-tagline-lockup
- Source: `references/examples/terminal-tagline-lockup.tsx`

**Problem.** Ending on the last log line feels unfinished; ending on a logo without a line feels mute.

**Solution.** Documentary terminal (or log) → one tagline → lockup. The tagline is the only editorial type.

**Build.**

1. Terminal or log scene.
2. Tagline fade or type.
3. Lockup.

**Forces.**

- The log is the demo
- A human sentence must still land
- Lockup is punctuation

### Chaos to Focus to UI (`chaos-to-focus-to-ui`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/chaos-to-focus-to-ui
- Source: `references/examples/chaos-to-focus-to-ui.tsx`

**Problem.** Starting on the UI explains nothing about volume. Starting on chaos and never entering the UI is a trailer.

**Solution.** Scatter or collage of many cards. Smash-zoom into one. Hard-cut or morph into the real product surface.

**Build.**

1. Field of cards.
2. Smash-zoom + flash.
3. Product UI documentary.

### Generate Place Ship (`generate-place-ship`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/generate-place-ship
- Source: `references/examples/generate-place-ship.tsx`

**Problem.** Generation without placement is a gallery. Placement without send is a mock.

**Solution.** Three worlds: generate (wipe / deblur), place (drag-to-target), ship (whip to a grid or send).

**Build.**

1. Generate with LED wipe or clip-deblur.
2. Drag or drop onto the layout.
3. Whip or send to a 2×2 grid.

### Metric to Globe to Price (`metric-to-globe-to-price`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/metric-to-globe-to-price
- Source: `references/examples/metric-to-globe-to-price.tsx`

**Problem.** Metrics, maps, and pricing shown together compete. They have to arrive as a sentence.

**Solution.** Table first. Chart or grid second. Channel/world third. Pricing last, with elastic snap.

**Build.**

1. Staggered metric table.
2. Chart pan → card-to-grid.
3. Icon converge / globe.
4. Pricing snap.

### Prompt to Output (`prompt-to-output`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/prompt-to-output
- Source: `references/examples/prompt-to-output.tsx`

**Problem.** If send and output share a scene, the viewer cannot tell work happened.

**Solution.** Separate scenes: type+send, then work, then the artifact as a new object (row of screens, card, player).

**Build.**

1. Type + send.
2. Work (analyzing / log / checks).
3. Artifact scene.

### Title Tool Lockup (`title-tool-lockup`)

- Scale: sequence
- Preview: https://editframe.com/motion/studies/title-tool-lockup
- Source: `references/examples/title-tool-lockup.tsx`

**Problem.** Three beats with no shared material feel like three bumpers.

**Solution.** Title (type or word stagger), one tool or character beat, lockup. Keep the ground color continuous.

**Build.**

1. Title.
2. One tool/character scene.
3. Lockup.

### Staggered Checklist Resolve (`staggered-checklist-resolve`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/staggered-checklist-resolve
- Source: `references/examples/staggered-checklist-resolve.tsx`

**Problem.** A list of setup steps shown all at once feels finished before it is read; shown too slowly feels like a loader.

**Solution.** Reveal the column first, then resolve down it: spinner on item 0, checks cascading 80–120ms apart, labels brightening as they complete.

**Build.**

1. Column of N rows: icon + label.
2. Appear: fade/slide up, stagger 80ms.
3. Item 0: spinner ~400ms, then check.
4. Items 1..n: snap to check in cascade.
5. Labels brighten on resolve.

**Forces.**

- N items must be understood as a set
- One resolve at a time

### Monospace Terminal Stack (`monospace-terminal-stack`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/monospace-terminal-stack
- Source: `references/examples/monospace-terminal-stack.tsx`

**Problem.** A CLI install that types in place does not feel like output accumulating.

**Solution.** Type the command with steps(); spawn output lines that push prior lines up, anchored to a baseline.

**Build.**

1. Command types with CSS steps() on ch-width text.
2. Each output line is born at the baseline.
3. Prior lines translate up by line-height.
4. Caret blinks, then vanishes on the last line.

### Streaming Log Follow (`streaming-log-follow`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/streaming-log-follow
- Source: `references/examples/streaming-log-follow.tsx`

**Problem.** A long agent log that does not follow the frontier loses the viewer at the bottom of the well.

**Solution.** Type lines with CSS. When content exceeds the viewport, lerp the scroller toward the newest line.

**Build.**

1. CSS typewriter per line.
2. Measure content height vs viewport.
3. Lerp scrollY toward the tail.
4. Optional fade of the scene at the end.

### Terminal Camera Documentary (`terminal-camera-documentary`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/terminal-camera-documentary
- Source: `references/examples/terminal-camera-documentary.tsx`

**Problem.** A static full-window terminal cannot show both the command and the success line.

**Solution.** Expand the window, then move a CSS camera through 4–5 named stages: wide, punch on init, hold, pull back, settle on success.

**Build.**

1. Window fades in and grows height.
2. Lines ledger in.
3. Camera stages: {tx,ty,s,atMs}[] as one keyframe.
4. Glow the success line.

### Routing Flow Diagram (`routing-flow-diagram`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/routing-flow-diagram
- Source: `references/examples/routing-flow-diagram.tsx`

**Problem.** A routing story told in prose is forgotten; told as a moving diagram it is kept.

**Solution.** Stage boxes in: requests, router node, model column. Grow connector arrows. Crossfade the output column through states, then exit.

**Build.**

1. Left request boxes slide in.
2. Arrows grow width in steps.
3. Router node appears.
4. Output boxes cycle color/state.
5. Column exits upward.

### File to Route Diagram (`file-to-route-diagram`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/file-to-route-diagram
- Source: `references/examples/file-to-route-diagram.tsx`

**Problem.** A filesystem path and a URL are the same idea; if they never connect on screen the mapping is lost.

**Solution.** Stagger a file tree. Highlight the target row. Draw an SVG stroke to a typing URL.

**Build.**

1. Tree rows slide in by depth.
2. Target row glows.
3. Bracket or arrow stroke-draws to the right.
4. URL types.

### Bracket Annotation Reveal (`bracket-annotation-reveal`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/bracket-annotation-reveal
- Source: `references/examples/bracket-annotation-reveal.tsx`

**Problem.** Code that is not labeled is decoration. Labels that appear before the code have nothing to hold.

**Solution.** Stagger the lines in. Then draw nested SVG brackets with sliding labels for each region.

**Build.**

1. Code lines stagger in.
2. Each bracket: stroke-draw, then label slides.
3. Nesting order = reading order.

### Staggered Metric Table (`staggered-metric-table`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/staggered-metric-table
- Source: `references/examples/staggered-metric-table.tsx`

**Problem.** A table that pops in complete cannot be read in time; a table that fades as a block has no order.

**Solution.** Title, then headers, then rows rising into grid positions while numeric cells count up.

**Build.**

1. Title rises.
2. Headers fade.
3. Rows stagger upward into y-slots.
4. Volume / percent cells count up.

### Scrolling Metric Leaderboard (`scrolling-metric-leaderboard`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/scrolling-metric-leaderboard
- Source: `references/examples/scrolling-metric-leaderboard.tsx`

**Problem.** A cost comparison that is a static list has no hero. A highlight with no scroll has no field.

**Solution.** Scroll a column of rows into frame. Crossfade each row pale→focused. Land on the highlighted hero row.

**Build.**

1. Title rises.
2. Column scrolls.
3. Pairwise opacity swaps focus row by row.
4. Hero row stays highlighted.

### Product Push In (`product-push-in`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/product-push-in
- Source: `references/examples/product-push-in.tsx`

**Problem.** A product that does not arrive cannot be the hero. A product that arrives without a ground (rings, tile, color-block) floats in a void.

**Solution.** Push the SKU in on a ground (sunburst, tile, color-block). Settle with a weightless bob. Land price and one line. Optional wipe out.

**Build.**

1. Ground appears (rings / tile / wipe).
2. Product scales in 0.86→1, 500–700ms ease-out.
3. Inner bob loop starts after settle.
4. Copy + price stagger.

### Before After Strikethrough Swap (`before-after-strikethrough-swap`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/before-after-strikethrough-swap
- Source: `references/examples/before-after-strikethrough-swap.tsx`

**Problem.** A comparison told as two stats side by side has no verdict. The old thing has to be visibly defeated.

**Solution.** Old card in. Strike through + dim. VS pop. New card slams. Chips stagger up.

**Build.**

1. Old card slides in and holds.
2. SVG stroke-dash strike + grayscale.
3. VS pops.
4. New card slams (overshoot).
5. Stat chips stagger.

### Staggered Screen Generation Row (`staggered-screen-generation-row`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/staggered-screen-generation-row
- Source: `references/examples/staggered-screen-generation-row.tsx`

**Problem.** An agent that 'generates onboarding' with one phone is a mock. Several screens arriving in order is a system.

**Solution.** Status pill. Then N device frames stagger left→right with connecting arrows. Camera pans with the arrival.

**Build.**

1. Status pill in.
2. Screens appear at appearAt[i].
3. Arrows between them.
4. Camera pan follows the newest.

### Card Rect Morph to Grid (`card-rect-morph-to-grid`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/card-rect-morph-to-grid
- Source: `references/examples/card-rect-morph-to-grid.tsx`

**Problem.** A hero chart that cuts to a dashboard wastes the object the viewer already has.

**Solution.** Lerp the hero card's x/y/w/h into a grid slot. Then pop the remaining cells.

**Build.**

1. Hero card holds.
2. Lerp rect hero → slot.
3. Stagger-pop the other cells.

### Staggered Grid Card Pop (`staggered-grid-card-pop`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/staggered-grid-card-pop
- Source: `references/examples/staggered-grid-card-pop.tsx`

**Problem.** A dashboard that appears as one image has no hierarchy.

**Solution.** Each card scale-pops from ~0.86 with a stagger. Guide lines optional.

**Build.**

1. cards[] with {x,y,w,h,popAt}.
2. scale 0.86→1, 200–280ms ease-out.

### Pill Column Scroll (`pill-column-scroll`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/pill-column-scroll
- Source: `references/examples/pill-column-scroll.tsx`

**Problem.** A catalog of templates shown as a static list has no 'many'. A scroll with no highlight has no choice.

**Solution.** A vertical column of pills scrolls. As each pill crosses center it bumps to the accent color. The last pill settles.

**Build.**

1. Column keyframe-scrolls.
2. Per-pill bump at precomputed crossing times.
3. Last pill settles (no bump-back).

### Typewriter Brief (`typewriter-brief`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/typewriter-brief
- Source: `references/examples/typewriter-brief.tsx`

**Problem.** A brief that is already on screen was never given. A brief that types with no box is just a headline.

**Solution.** Type into a growing highlight box with selection handles. The box height follows line count.

**Build.**

1. Empty highlight box.
2. Characters appear on a schedule.
3. Box height grows with lines.
4. Optional Figma-style handles.

### Code Block Reveal (`code-block-reveal`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/code-block-reveal
- Source: `references/examples/code-block-reveal.tsx`

**Problem.** A patch that is fully visible at scene start cannot be the event.

**Solution.** Clip-path reveal the code block. Optionally stroke-draw an underline under the key phrase.

**Build.**

1. Card in.
2. clip-path inset bottom 100% → 0.
3. Underline dashoffset on the phrase.

### Phone Notification Stack (`phone-notification-stack`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/phone-notification-stack
- Source: `references/examples/phone-notification-stack.tsx`

**Problem.** A feature announcement that is not inside a phone is a slide. Two notifications that never separate are one blob.

**Solution.** Lock screen. Zoom into the stack. Front card scales; the back card slides out from behind; camera pulls back to the device.

**Build.**

1. Phone chrome holds.
2. Focus-zoom on the stack.
3. Back card reveals from behind.
4. Pull back to 1×.

### Video Well (`video-well`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/video-well
- Source: `references/examples/video-well.tsx`

**Problem.** Unframed footage in a graphic ad looks like a clip dropped on a poster. The well makes it editorial.

**Solution.** A rounded (or TV, or corner-marked) frame holds a fixed rect. Copy lives outside. The well itself barely moves; the footage may push-in.

**Build.**

1. Frame in (marks / TV badge / veil).
2. Footage or poster fills the well rect.
3. Copy above/below, not on the picture.
4. Well stays put across the scene.

### Swing Ticket Rack (`swing-ticket-rack`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/swing-ticket-rack
- Source: `references/examples/swing-ticket-rack.tsx`

**Problem.** Looks shown as a grid are a catalog. Looks hung on strings are merchandise.

**Solution.** A rail draws in. Tickets drop on strings and sway. Faces hold photos + price chips.

**Build.**

1. Rail draws.
2. Tickets drop with string length.
3. Infinite sway, phase-offset.

### Spec Band Stagger (`spec-band-stagger`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/spec-band-stagger
- Source: `references/examples/spec-band-stagger.tsx`

**Problem.** Specs in a paragraph are not scannable. Specs in bands that arrive together are a wall.

**Solution.** Full-width bands rise in sequence. Each band: image, name, specs, price.

**Build.**

1. Header + chip.
2. Bands stagger 300–400ms.
3. Footer holds.

### Flavor Montage to Grid (`flavor-montage-to-grid`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/flavor-montage-to-grid
- Source: `references/examples/flavor-montage-to-grid.tsx`

**Problem.** Six SKUs at once is a shelf. One SKU forever is a hero with no range.

**Solution.** Cycle items one-at-a-time on a color-block, then collapse all of them into a grid.

**Build.**

1. Per item: solo stage + matching bg.
2. After the last, all animate to grid slots.
3. Title on the grid.

**Related.** `colorway-cycle-selector`, `staggered-colorway-grid`

### Colorway Cycle Selector (`colorway-cycle-selector`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/colorway-cycle-selector
- Source: `references/examples/colorway-cycle-selector.tsx`

**Problem.** A range that does not feel selectable is a poster of swatches.

**Solution.** Main preview crossfades through colorways. Swatches cascade in. A highlight tracks the active index.

**Build.**

1. Preview cycles with timed Reveals.
2. Swatches cascade.
3. Selection chip follows index.

### Staggered Colorway Grid (`staggered-colorway-grid`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/staggered-colorway-grid
- Source: `references/examples/staggered-colorway-grid.tsx`

**Problem.** A family of SKUs shown as one photo hides the range.

**Solution.** Title. Then tiles stagger into a 3×3 (or similar) and lift out together.

**Build.**

1. Title.
2. Per-index Reveal offsets.
3. Shared exit.

### Offer Bundle Push In (`offer-bundle-push-in`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/offer-bundle-push-in
- Source: `references/examples/offer-bundle-push-in.tsx`

**Problem.** A price without an object is a banner. An object without a push-in is a still of a box.

**Solution.** Reuse Product Push In on the bundle. Headline drops. Supporting line clip-wipes.

**Build.**

1. Ground (sunburst / rise wipe).
2. Pack push-in + bob.
3. Headline, then sub wipe.

### Paper Stack Panels (`paper-stack-panels`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/paper-stack-panels
- Source: `references/examples/paper-stack-panels.tsx`

**Problem.** Two product surfaces shown side by side are a diagram. Slid past each other they become work.

**Solution.** A unified window fades in. Panels slide in opposite directions with overlap. Satellite cards pop. Exit together.

**Build.**

1. Window in.
2. Opposing panel slides.
3. Float cards.
4. Shared exit.

### Vertical Depth Card Carousel (`vertical-depth-card-carousel`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/vertical-depth-card-carousel
- Source: `references/examples/vertical-depth-card-carousel.tsx`

**Problem.** A carousel that only translates X is a slider. Depth makes the deck a model.

**Solution.** Cards indexed by depth: scale, y, and opacity from a depth curve. Advance the index over time.

**Build.**

1. depth = f(i - playhead).
2. scale/y/opacity from depth.
3. Optional bounce table.

### Invoice Collage Scatter (`invoice-collage-scatter`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/invoice-collage-scatter
- Source: `references/examples/invoice-collage-scatter.tsx`

**Problem.** One invoice is a document. Twelve invoices arriving from off-positions are volume.

**Solution.** Cards scatter in from stored poses. One hero recenters and grows. Headline types above.

**Build.**

1. N cards, per-card enter keyframes.
2. Hero centers.
3. Headline.

### Popup Option Cycle (`popup-option-cycle`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/popup-option-cycle
- Source: `references/examples/popup-option-cycle.tsx`

**Problem.** A settings menu that does not cycle is a screenshot. The cycle is the product behavior.

**Solution.** Button pops. Popup rises. Options cycle highlight + check + color.

**Build.**

1. Button in.
2. Popup.
3. N option windows, inverse on the others.

### Odometer Percent Reveal (`odometer-percent-reveal`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/odometer-percent-reveal
- Source: `references/examples/odometer-percent-reveal.tsx`

**Problem.** A stat that is already the final number has no claim. Ticking through nearby values makes the number an event.

**Solution.** Stack digit layers. Crossfade 55→60 (or from→to). Then swap the trailing words.

**Build.**

1. Line 1 holds.
2. Stacked percents opacity-tick.
3. Trailing words blink in.

### Card Deck Fan to Grid (`card-deck-fan-to-grid`)

- Scale: scene
- Preview: https://editframe.com/motion/studies/card-deck-fan-to-grid
- Source: `references/examples/card-deck-fan-to-grid.tsx`

**Problem.** A grid that starts as a grid was never a deck. The fan is the editorial moment.

**Solution.** Fly cards to a stack. Fan to an arc. Deal into a grid. Stamp optional.

**Build.**

1. Fly-in to deck.
2. Fan arc + title.
3. Deal to grid + chrome.

**Related.** `editorial-mosaic-reflow`

### CTA Cursor Click (`cta-cursor-click`)

- Scale: part
- Preview: https://editframe.com/motion/studies/cta-cursor-click
- Source: `references/examples/cta-cursor-click.tsx`

**Problem.** A button that lights up by itself is a hover state. A cursor that travels and presses is a decision.

**Solution.** Camera punches the button. A pointer flies in screen-space (outside the zoom). Squeeze, ripple, button scale/flash.

**Build.**

1. Optional panel in.
2. Camera zoom to button center.
3. Cursor from offscreen to target.
4. Press + ripple + flash.

### Cursor Chip Click (`cursor-chip-click`)

- Scale: part
- Preview: https://editframe.com/motion/studies/cursor-chip-click
- Source: `references/examples/cursor-chip-click.tsx`

**Problem.** Suggested actions that fade in together are a menu. One chip getting clicked is a choice.

**Solution.** Chips stagger in. Pointer flies to index 0. Press flash + ripple. Chips fade out.

**Build.**

1. Chip row stagger.
2. Cursor path from→to.
3. Press + ripple.
4. Row out.

### Light Sweep Highlight (`light-sweep-highlight`)

- Scale: part
- Preview: https://editframe.com/motion/studies/light-sweep-highlight
- Source: `references/examples/light-sweep-highlight.tsx`

**Problem.** New content that does not flash the eye is easy to miss. A full-card blink is cheap.

**Solution.** A skewed gradient sweeps L→R across a bordered element once.

**Build.**

1. ::before gradient, skew.
2. translateX across.
3. Opacity envelope.

### Zoom to Control (`zoom-to-control`)

- Scale: part
- Preview: https://editframe.com/motion/studies/zoom-to-control
- Source: `references/examples/zoom-to-control.tsx`

**Problem.** A dropdown that appears on a wide shot is a speck. Zooming the whole app to that control is the sentence.

**Solution.** Continuous camera from scene-N framing to the control. Sibling chrome fades. Control Reveals. Optional white flash.

**Build.**

1. camFrom {z,tx,ty} → camTo.
2. Sidebar fade.
3. Control enter.
4. Flash.

### Highlight Sweep Select (`highlight-sweep-select`)

- Scale: part
- Preview: https://editframe.com/motion/studies/highlight-sweep-select
- Source: `references/examples/highlight-sweep-select.tsx`

**Problem.** Selected text that is already highlighted was never selected.

**Solution.** Grow a highlight with background-size left→right across the phrase.

**Build.**

1. Target span.
2. background-size 0→100%.
3. Then the next action (zoom, menu).

### Tab Walkthrough (`tab-walkthrough`)

- Scale: part
- Preview: https://editframe.com/motion/studies/tab-walkthrough
- Source: `references/examples/tab-walkthrough.tsx`

**Problem.** A nav that does not get walked is chrome. Hops make the path.

**Solution.** Cursor arcs between tabs. Underline and color snap on landing. Optional insert of a new tab.

**Build.**

1. tabs[] + hop windows.
2. Underline keyframes.
3. Optional insert + badge.

### Strip to Panel Morph (`strip-to-panel-morph`)

- Scale: part
- Preview: https://editframe.com/motion/studies/strip-to-panel-morph
- Source: `references/examples/strip-to-panel-morph.tsx`

**Problem.** Cutting from a nav strip to a full dashboard loses the object.

**Solution.** Morph height/top of the strip into the panel while the camera pulls back and content fades in.

**Build.**

1. stripRect → fullRect.
2. Camera pullback.
3. Content fade.

### White Card Zoom Out (`white-card-zoom-out`)

- Scale: part
- Preview: https://editframe.com/motion/studies/white-card-zoom-out
- Source: `references/examples/white-card-zoom-out.tsx`

**Problem.** A composer that was the whole world cannot suddenly sit on a desktop unless the white *is* that card.

**Solution.** Start at 3× on white. Zoom out to reveal the desktop. Secondary panel slides in. The white was the product card.

**Build.**

1. startScale 3.2 → endScale 1.4.
2. Desktop fades up.
3. Side panel slides.

### Focus Click Pullback (`focus-click-pullback`)

- Scale: part
- Preview: https://editframe.com/motion/studies/focus-click-pullback
- Source: `references/examples/focus-click-pullback.tsx`

**Problem.** A Run/Send that is not punched is a tiny button in a wide shot.

**Solution.** Push into the control. Cursor travels and clicks (ring). Pull back while panels morph to the next layout.

**Build.**

1. Push.
2. Click + ring.
3. Pull + panel morph.

### Camera Push Type On (`camera-push-type-on`)

- Scale: part
- Preview: https://editframe.com/motion/studies/camera-push-type-on
- Source: `references/examples/camera-push-type-on.tsx`

**Problem.** A long command typed on a wide terminal is unreadable. A type-on without a push is a subtitle.

**Solution.** Slow camera push on the prompt. Characters appear. Submit morphs the line into a chip.

**Build.**

1. One long camera keyframe.
2. Per-char instant-show.
3. Submit swap.

### Grid Card Zoom (`grid-card-zoom`)

- Scale: part
- Preview: https://editframe.com/motion/studies/grid-card-zoom
- Source: `references/examples/grid-card-zoom.tsx`

**Problem.** A dashboard of many cards has no hero until the camera chooses one.

**Solution.** Transform the whole grid (origin 0,0) so one cell fills the frame.

**Build.**

1. Know panel size + target index.
2. zoom scale + tx/ty.
3. One CSS keyframe.

**Related.** `inset-focus-relay`

### LED Generation Wipe (`led-generation-wipe`)

- Scale: part
- Preview: https://editframe.com/motion/studies/led-generation-wipe
- Source: `references/examples/led-generation-wipe.tsx`

**Problem.** A generate button that cuts to a result skips the inference. A spinner is a wait. A wipe is a process.

**Solution.** Dot-mosaic strips stagger from the send origin, shimmer, then dissolve to the result.

**Build.**

1. stripCount.
2. staggered opacity windows.
3. sin shimmer.
4. dissolve to image.

### Clip Reveal Deblur (`clip-reveal-deblur`)

- Scale: part
- Preview: https://editframe.com/motion/studies/clip-reveal-deblur
- Source: `references/examples/clip-reveal-deblur.tsx`

**Problem.** An image that pops sharp is a JPEG. Revealing it through blur says it was made.

**Solution.** clip-path inset in one direction while blur goes 8px → 0.

**Build.**

1. direction.
2. duration 300–500ms.
3. blurAmount.

### Analyzing Card Sheen (`analyzing-card-sheen`)

- Scale: part
- Preview: https://editframe.com/motion/studies/analyzing-card-sheen
- Source: `references/examples/analyzing-card-sheen.tsx`

**Problem.** A static 'Analyzing…' pill is a label. A breathing sheen is a running process.

**Solution.** Card with rotating conic sheen and glow. Pill copy swaps. Optional shrink-to-corner.

**Build.**

1. conic-gradient angle = t.
2. box-shadow breathe.
3. pill states[].

### List Row Sweep (`list-row-sweep`)

- Scale: part
- Preview: https://editframe.com/motion/studies/list-row-sweep
- Source: `references/examples/list-row-sweep.tsx`

**Problem.** Rows that fade in as blocks do not feel generated. A width sweep feels like a mask coming off.

**Solution.** Each row widens from 0. Content fades. Optional glow halo.

**Build.**

1. width 0 → full.
2. content stagger.
3. halo pulse.

### Draft to Hero Morph (`draft-to-hero-morph`)

- Scale: part
- Preview: https://editframe.com/motion/studies/draft-to-hero-morph
- Source: `references/examples/draft-to-hero-morph.tsx`

**Problem.** Publish that cuts to a new card loses the object. The draft *becomes* the hero.

**Solution.** Crossfade chrome away. Lerp the draft rect into the isolated hero card. Title/desc/CTA fade in.

**Build.**

1. UI dissolve.
2. oldRect → heroRect.
3. Type in.

### Stacked Card Focus Zoom (`stacked-card-focus-zoom`)

- Scale: part
- Preview: https://editframe.com/motion/studies/stacked-card-focus-zoom
- Source: `references/examples/stacked-card-focus-zoom.tsx`

**Problem.** A stack that never separates is one card. Focus requires a front and a behind.

**Solution.** Front card scales and translates. Back card slides out from behind. Then pull back or smash-zoom.

**Build.**

1. Two cards, stack offset.
2. Front focus scale.
3. Back reveal.
4. Camera.

### Bulk Assign Modal (`bulk-assign-modal`)

- Scale: part
- Preview: https://editframe.com/motion/studies/bulk-assign-modal
- Source: `references/examples/bulk-assign-modal.tsx`

**Problem.** Assigning one row is a click. Assigning six at once is the product.

**Solution.** Checkboxes ramp together. Modal lists agents. One row flashes. Icons settle on every row.

**Build.**

1. Bulk select, no per-row stagger.
2. Modal.
3. Pick.
4. Icons settle.

### Sunburst Badge (`sunburst-badge`)

- Scale: part
- Preview: https://editframe.com/motion/studies/sunburst-badge
- Source: `references/examples/sunburst-badge.tsx`

**Problem.** A wordmark on a flat field has no world. A spinning sunburst is the world for a CPG open.

**Solution.** Rays scale in and spin. Wordmark mask-wipes on a sticker badge. Color-block can wipe out.

**Build.**

1. Burst in + spin.
2. Mask-wipe wordmark.
3. Optional wipe-out.

### Concentric Ring CTA (`concentric-ring-cta`)

- Scale: part
- Preview: https://editframe.com/motion/studies/concentric-ring-cta
- Source: `references/examples/concentric-ring-cta.tsx`

**Problem.** A URL on black is a slide. Rings opening around the lockup are a close.

**Solution.** Rings scale in. Lockup pops + bobs. URL pill rises.

**Build.**

1. Rings.
2. Lockup pop/bob.
3. URL.

### Rising Bubble Field (`rising-bubble-field`)

- Scale: part
- Preview: https://editframe.com/motion/studies/rising-bubble-field
- Source: `references/examples/rising-bubble-field.tsx`

**Problem.** A soda can without bubbles is a photo. Ambient rise is the material.

**Solution.** N bubbles, CSS vars for x, negative animation-delay for phase. Loop.

**Build.**

1. bubbleCount.
2. speeds / sizes / x.
3. negative delay.

### Product Tile to Well Morph (`product-tile-to-well-morph`)

- Scale: part
- Preview: https://editframe.com/motion/studies/product-tile-to-well-morph
- Source: `references/examples/product-tile-to-well-morph.tsx`

**Problem.** Hero tile cutting to a video well is two objects. Morphing the tile *into* the well is one.

**Solution.** On --ef-transition-out-start, lerp the tile rect into the well rect.

**Build.**

1. fromRect = hero tile.
2. toRect = well.
3. overlap window.

### Metric Row Stagger (`metric-row-stagger`)

- Scale: part
- Preview: https://editframe.com/motion/studies/metric-row-stagger
- Source: `references/examples/metric-row-stagger.tsx`

**Problem.** Rows that appear as a table have no reading order.

**Solution.** Each row translates up into its slot with a stagger. Optional count-up in cells.

**Build.**

1. slotY[i].
2. stagger 60–100ms.
3. count-up optional.

### Caption Fade Up (`caption-fade-up`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/caption-fade-up
- Source: `references/examples/caption-fade-up.tsx`

**Problem.** A caption that pops in place is a UI label. Rising 20–30px is a lower-third.

**Solution.** Opacity 0→1 + translateY(30px→0). Hold.

**Build.**

1. text.
2. offsetY 30.
3. duration 250–400ms.

### Logo Clip Wipe (`logo-clip-wipe`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/logo-clip-wipe
- Source: `references/examples/logo-clip-wipe.tsx`

**Problem.** A logo that fades in is a still. A left→right clip is a stamp.

**Solution.** clip-path inset left 100% → 0 on the mark. Optional leading edge.

**Build.**

1. wipeDuration 400–600ms.
2. kicker after.

### Check Pop (`check-pop`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/check-pop
- Source: `references/examples/check-pop.tsx`

**Problem.** A check that is just there is a bullet. A check that pops is a completion.

**Solution.** Scale 0.55→1 with a short overshoot. 160–200ms.

**Build.**

1. accent fill.
2. overshoot optional.

### Spinner to Check (`spinner-to-check`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/spinner-to-check
- Source: `references/examples/spinner-to-check.tsx`

**Problem.** A spinner that never becomes a check is a hang. A check with no spinner never worked.

**Solution.** Spinner visible first. At resolve, hide spinner and check-pop.

**Build.**

1. spin infinite.
2. hide at resolve.
3. check-pop.

### Incremental Title States (`incremental-title-states`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/incremental-title-states
- Source: `references/examples/incremental-title-states.tsx`

**Problem.** A title that types with a caret is a CLI. A title that swaps full-string states is a machine.

**Solution.** Stack full strings (C, Cu, Cur…). Opacity windows, no caret.

**Build.**

1. states[].
2. holdMsPerState.

### Pixel Twinkle (`pixel-twinkle`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/pixel-twinkle
- Source: `references/examples/pixel-twinkle.tsx`

**Problem.** Empty corners on a title card are dead. Seeded pixels that twinkle are a field.

**Solution.** Absolute dots. Infinite opacity/scale keyframes, negative delay from a seed.

**Build.**

1. count.
2. seeded positions.
3. twinkle period.

### Panel Slide In (`panel-slide-in`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/panel-slide-in
- Source: `references/examples/panel-slide-in.tsx`

**Problem.** A side panel that fades on top of the page has no edge. Sliding from its own width is the edge.

**Solution.** translateX(panelWidth → 0). Prefer CSS over onFrame.

**Build.**

1. offsetPx = panel width.
2. duration 300–500ms.
3. ease-out.

### Conic Halo Pulse (`conic-halo-pulse`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/conic-halo-pulse
- Source: `references/examples/conic-halo-pulse.tsx`

**Problem.** An AI control that does not glow is a normal button. A one-shot conic pulse is the affordance.

**Solution.** Conic-gradient behind the control. Scale/opacity up then down, once.

**Build.**

1. accentGradient.
2. duration ~1.8s.
3. scalePeak.

### Press Pop (`press-pop`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/press-pop
- Source: `references/examples/press-pop.tsx`

**Problem.** A click with no squash is a hover. Scale down then back is the finger.

**Solution.** scale 1 → 0.94 → 1 in 120–180ms. Optional ripple sibling.

**Build.**

1. pressScale 0.94.
2. duration 150ms.

### Editorial Masthead (`editorial-wordmark-hook`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/editorial-wordmark-hook
- Source: `references/examples/editorial-wordmark-hook.tsx`

**Problem.** A wordmark that simply fades up has little character, while a spring or slam conflicts with a quiet editorial voice.

**Solution.** Tighten a serif masthead from slightly open tracking as it gently rises into place. Draw a centered hairline underneath, then introduce an italic descriptor. A fine frame and small folio balance the negative space.

**Build.**

1. Use a short serif masthead with a single italic word or syllable.
2. Set a fine rectangular border inside the safe area and small fixed publication details.
3. Animate tracking from .04em to -.065em with a 25px lift over 1.4 seconds.
4. Start the centered rule after 800ms and the descriptor after 1.4s.
5. Hold the resolved identity without a competing background loop.

**Forces.**

- The widest tracked state must fit the frame.
- Hairlines need enough contrast to survive scaling.
- Small labels should stay subordinate to the masthead.

**Related.** `editorial-title-sequence`, `rule-draw`

### Title Fade (`title-fade`)

- Scale: motif
- Preview: https://editframe.com/motion/studies/title-fade
- Source: `references/examples/title-fade.tsx`

**Problem.** Not every title needs a trick. Some need to appear, hold, and leave.

**Solution.** Opacity in, hold, opacity out. No y unless the film already floats.

**Build.**

1. fadeIn 300ms.
2. hold.
3. fadeOut 250ms.
