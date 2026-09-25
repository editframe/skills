---
name: motion-design
description: Conceive, structure, and evaluate motion design for video. Use for visual concepts, temporal composition, choreography, rhythm, and creative iteration.
license: MIT
metadata:
  author: editframe
  version: "3.0"
---

# Motion Design

Design what changes in the viewer's experience over time. Let movement, stillness, composition, and sound express that change.

Use this skill as a cognitive architecture for creative decisions. Keep implementation details in the current Editframe composition skill.

## The reasoning loop

Connect five decisions:

- **Intent:** What experience does the work create?
- **Visual logic:** What relationships make that experience visible?
- **Temporal structure:** How do those relationships develop over time?
- **Attention:** What does the viewer notice, anticipate, and retain?
- **Evaluation:** What does viewing reveal about the concept?

Move between these decisions as evidence demands. A weak transition can expose a weak visual relationship or an unclear premise.

Keep the reasoning proportional to the task. A small title treatment needs fewer decisions than a full film.

## Establish the intended experience

Start from the user's brief, audience, subject, and viewing conditions. Preserve the user's chosen tone and form.

Identify what the viewer encounters first and what changes by the end. The change can involve understanding, emotion, expectation, or perception.

Atmosphere, beauty, ambiguity, surprise, and sensory pleasure can be valid purposes. Do not force every work into an explanatory message.

Separate fixed constraints from creative choices. Duration, aspect ratio, delivery context, and required content can limit the design without determining its style.

Express the premise in a short statement that connects the subject to an experience. Use it to judge choices, not as compulsory output.

When an existing brief answers these questions, use it. Ask only for missing information that materially changes the direction.

## Find the visual logic

Treat the composition as a system of relationships. Consider identity, scale, proximity, alignment, repetition, depth, contrast, and negative space.

Ask what the subject does, rather than only what it looks like. Actions such as accumulation, separation, attraction, resistance, and transformation can suggest a visual concept.

Choose relationships that make the premise perceptible. A visual metaphor is useful when it clarifies or enriches the experience.

Consider distinct concepts before investing in execution. Compare how each concept develops over time, not just how its opening frame looks.

Choose a coherent motion language. Decide what remains stable, what changes, and which departures carry meaning.

Physical behavior is one possible language. Graphic, typographic, mechanical, organic, and deliberately impossible behavior are also available.

Use material metaphors when they help. Do not derive timing or deformation from a mandatory material category.

Let repeated behavior establish expectations. A deliberate departure can then create emphasis, surprise, or a change in meaning.

## Compose time

Think in perceptible events and intervals. An event changes the composition; an interval lets the viewer read, anticipate, inhabit, or reconsider it.

Design the full temporal shape before refining individual gestures. Consider density, pace, repetition, pauses, escalation, release, and the ending.

Distinguish movement duration from comprehension time. A fast entrance can lead into a long hold; slow movement can sustain tension.

Use cuts, holds, overlaps, and continuous transformations according to their role. A transition can preserve a relationship, reveal a connection, or create a rupture.

Preserve identity across changes when continuity matters. Decide which visual feature lets the viewer recognize an element through its transformation.

Break continuity when the experience calls for surprise or disorientation. Judge whether the break feels deliberate in context.

Let rhythm emerge from the subject and the intended experience. Repetition can establish rhythm; variation can redirect it.

When sound is present, decide where motion follows, anticipates, or counters it. Avoid attaching every event to a beat by default.

For silent work, use visual changes and intervals to establish rhythm. For loops, judge the return to the opening as part of the composition.

Choose an ending that serves the brief. Resolution, suspension, interruption, and continuation can each be appropriate.

## Choreograph attention

Design a hierarchy of perceptual emphasis. Consider contrast, scale, position, motion, direction, and the viewer's previous focus together.

Several elements can move at once without competing. Shared direction, rhythm, or transformation can make their relationship clear.

Coordinate foreground and background as parts of one composition. Their interaction can establish depth, tension, atmosphere, or a shared event.

Use sequential reveals when order matters. Use simultaneous action when the relationship or collective behavior matters more than individual entrances.

Stillness can carry emphasis. A stationary element within a moving field can become the focal point.

Anticipate the viewer's eye movement between events. Decide whether to preserve focus, transfer it, or deliberately divide it.

Give essential text enough time and contrast for its viewing context. If distortion or fragmentation serves the concept, preserve the required level of comprehension.

Do not confuse constant activity with engagement. Do not confuse simplicity with quality. Judge both against the intended experience.

## Develop and evaluate

Prototype the least expensive version that tests the central idea. Use rough states and timing when they answer the question.

If texture, physical behavior, or sound defines the idea, test that quality early. A generic placeholder may conceal its value.

Review the work in motion at the intended duration and frame rate. Use still frames to inspect composition, not to infer temporal quality.

Evaluate these questions:

- **Experience:** Does the sequence produce the intended feeling, understanding, or perceptual change?
- **Relationships:** Does motion reveal something that the arrangement alone does not?
- **Structure:** Does each event or interval contribute to the temporal shape?
- **Attention:** Can the viewer follow the intended relationships and read essential content?
- **Character:** Do the choices fit this subject and brief?
- **Execution:** Do transitions, continuity, legibility, and sound work in the actual output?

Treat these as diagnostic lenses, not a scorecard that every style must satisfy identically.

When something fails, locate the decision that causes it. More polish cannot repair an unclear premise or an ineffective temporal structure.

Compare alternatives around a specific uncertainty. Change enough to test that uncertainty, then judge the result in context.

Refine gesture, easing, spacing, and secondary motion once their purpose is clear. Derive values from the composition and playback evidence.

Check the intended viewing format and any accessibility requirements. Inspect the rendered result, including its opening, transitions, and ending.

Stop when the work fulfills the brief and further changes lack a clear purpose. Keep unresolved creative questions explicit.

## Translate the concept into a composition

Retain a compact account of the premise, visual relationships, major events, attention flow, and open questions.

Choose the useful form: a short explanation, key states, a storyboard, or a timing map. Do not require a separate document.

Use current Editframe composition guidance for APIs, timeline behavior, deterministic playback, and rendering. Verify those mechanics during implementation.

If a technical constraint changes the concept, return to the affected creative decision. Preserve the intended experience through the revision.

## Choose a catalog study

The motion catalog holds maintained studies. Each study states a problem, a solution, and a build recipe.

Choose a study by the problem it solves. Do not copy the catalog subject, type, or palette.

Start with Essentials when the job is reveal, attention, arrangement, response, continuity, or a change that needs explanation.

Adapt the recipe to the brief. If the recipe cannot survive the user's content, choose another study.

Use the current Editframe composition skill for APIs, timeline behavior, and rendering.

Each card lists a source file. Read it to see one working build of the recipe.

`references/` mirrors the catalog source tree. Examples import helpers from `references/examples/shared/` and `references/src/primitives/`.

To run an example, copy it with the helper files it imports. Use React, `@editframe/react`, `@editframe/elements`, and Tailwind CSS. Import `src/primitives/app.css` and `frame.css` one time.

The web copy of this skill has no source files. Open the preview page to read the source.

Open `references/catalog.md` when you need the full recipe of a study that is not in Essentials. The published copy is https://editframe.com/skills/motion-design/catalog.md.

Preview a study at `https://editframe.com/motion/studies/{id}`.

## Motion Catalog

Essentials list full recipes. The table below lists every other study.
Open `references/catalog.md` for the full recipe of a study that is not in Essentials.

### Essentials

#### Reveal content

Give information an entrance, a reading order, and time to land.

##### Title Fade (`title-fade`)

- Lesson: Balance an entrance, a reading hold, and an exit.
- Scale: motif
- Preview: https://editframe.com/motion/studies/title-fade
- Source: `references/examples/title-fade.tsx`

**Problem.** Not every title needs a trick. Some need to appear, hold, and leave.

**Solution.** Opacity in, hold, opacity out. No y unless the film already floats.

**Build.**

1. fadeIn 300ms.
2. hold.
3. fadeOut 250ms.

##### Masked Word Stagger (`word-stagger-reveal`)

- Lesson: Use stagger to set the pace of a phrase.
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

##### Stroke Dash Draw (`stroke-dash-draw`)

- Lesson: Reveal a path through the gesture that draws it.
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

#### Guide attention

Make the important detail clear while keeping its context.

##### Word Highlight (`caption-word-highlight`)

- Lesson: Emphasize the spoken word without losing the sentence.
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

##### Contrast Isolation (`focus-contrast-isolation`)

- Lesson: Direct the eye by reducing competing contrast.
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

##### Pan + Zoom (`focus-pan-zoom`)

- Lesson: Connect a close-up to the view it came from.
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

#### Arrange elements

Make order, hierarchy, and structure visible through movement.

##### Staggered Tile Cascade (`staggered-tile-cascade`)

- Lesson: Turn simultaneous arrivals into a readable sequence.
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

##### Editorial Mosaic Reflow (`editorial-mosaic-reflow`)

- Lesson: Change the hierarchy while preserving each element.
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

##### Exploded Volume (`exploded-volume`)

- Lesson: Separate parts to explain how a whole fits together.
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

#### Respond to actions

Show cause, consequence, and a clear resting state.

##### Elastic Snap (`elastic-snap`)

- Lesson: Use compression, overshoot, and settling to convey force.
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

##### Click Confirmation (`focus-click-confirmation`)

- Lesson: Connect an action to visible confirmation.
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

##### Drag & Drop (`focus-drag-and-drop`)

- Lesson: Show pickup, a destination, and a completed drop.
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

#### Connect scenes

Choose what carries across an edit: motion, time, or an object.

##### Cut on Action (`cut-on-action`)

- Lesson: Carry one action across a change of viewpoint.
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

##### Temporal Dissolve (`temporal-dissolve`)

- Lesson: Use an overlap to communicate elapsed time.
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

##### Shared-object Morph (`shared-object-morph`)

- Lesson: Let a recognizable object connect two settings.
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

#### Explain change

Help the viewer follow quantities instead of comparing static states.

##### Stroke Draw Chart (`stroke-draw-chart`)

- Lesson: Reveal a trend in order and emphasize its endpoint.
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

##### Unit Regrouping (`unit-regrouping`)

- Lesson: Keep individual units visible as their grouping changes.
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

##### Proportional Flow (`proportional-flow`)

- Lesson: Change proportions while preserving the total.
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

### Other studies

| id | name | collection | scale | problem |
|---|---|---|---|---|
| `social-ad-spine` | Social Ad Spine | — | composition | A social ad that is only a hero shot feels like a still; one that is only a logo feels like a bumper. The viewer needs a spine that runs from hook to lockup. |
| `product-demo-documentary` | Product Demo Documentary | — | composition | A UI recreation without a camera plan is a screen recording. A camera plan without a documentary spine is a random zoom. |
| `launch-montage` | Launch Montage | — | composition | A launch that only shows UI feels small. A launch that only shows type feels empty. The film has to alternate proof and name. |
| `character-brand-film` | Character Brand Film | — | composition | A lockup that never performs is a still. A mascot performance that never becomes a wordmark is a cartoon with no brand. |
| `agent-workflow-reel` | Agent Workflow Reel | — | composition | Agent demos turn into identical typing. The viewer needs phases: brief, work, artifact — not a log. |
| `editorial-title-sequence` | Editorial Title Sequence | — | composition | A single title card has no progression; a montage of unrelated type styles feels like separate films. |
| `hook-hero-proof-offer-lockup` | Hook Hero Proof Offer Lockup | — | sequence | Without a shared order, every social ad invents a new structure and the catalog cannot reuse scenes. |
| `terminal-tagline-lockup` | Terminal Tagline Lockup | — | sequence | Ending on the last log line feels unfinished; ending on a logo without a line feels mute. |
| `chaos-to-focus-to-ui` | Chaos to Focus to UI | — | sequence | Starting on the UI explains nothing about volume. Starting on chaos and never entering the UI is a trailer. |
| `generate-place-ship` | Generate Place Ship | — | sequence | Generation without placement is a gallery. Placement without send is a mock. |
| `metric-to-globe-to-price` | Metric to Globe to Price | — | sequence | Metrics, maps, and pricing shown together compete. They have to arrive as a sentence. |
| `prompt-to-output` | Prompt to Output | — | sequence | If send and output share a scene, the viewer cannot tell work happened. |
| `title-tool-lockup` | Title Tool Lockup | — | sequence | Three beats with no shared material feel like three bumpers. |
| `staggered-checklist-resolve` | Staggered Checklist Resolve | — | scene | A list of setup steps shown all at once feels finished before it is read; shown too slowly feels like a loader. |
| `monospace-terminal-stack` | Monospace Terminal Stack | — | scene | A CLI install that types in place does not feel like output accumulating. |
| `streaming-log-follow` | Streaming Log Follow | — | scene | A long agent log that does not follow the frontier loses the viewer at the bottom of the well. |
| `terminal-camera-documentary` | Terminal Camera Documentary | — | scene | A static full-window terminal cannot show both the command and the success line. |
| `routing-flow-diagram` | Routing Flow Diagram | — | scene | A routing story told in prose is forgotten; told as a moving diagram it is kept. |
| `file-to-route-diagram` | File to Route Diagram | — | scene | A filesystem path and a URL are the same idea; if they never connect on screen the mapping is lost. |
| `bracket-annotation-reveal` | Bracket Annotation Reveal | — | scene | Code that is not labeled is decoration. Labels that appear before the code have nothing to hold. |
| `staggered-metric-table` | Staggered Metric Table | — | scene | A table that pops in complete cannot be read in time; a table that fades as a block has no order. |
| `scrolling-metric-leaderboard` | Scrolling Metric Leaderboard | — | scene | A cost comparison that is a static list has no hero. A highlight with no scroll has no field. |
| `slot-machine-ticker` | Word Slot | Typography | scene | Crossfading successive words obscures their relationship and gives each state no physical continuity. |
| `product-push-in` | Product Push In | — | scene | A product that does not arrive cannot be the hero. A product that arrives without a ground (rings, tile, color-block) floats in a void. |
| `before-after-strikethrough-swap` | Before After Strikethrough Swap | — | scene | A comparison told as two stats side by side has no verdict. The old thing has to be visibly defeated. |
| `staggered-screen-generation-row` | Staggered Screen Generation Row | — | scene | An agent that 'generates onboarding' with one phone is a mock. Several screens arriving in order is a system. |
| `card-rect-morph-to-grid` | Card Rect Morph to Grid | — | scene | A hero chart that cuts to a dashboard wastes the object the viewer already has. |
| `staggered-grid-card-pop` | Staggered Grid Card Pop | — | scene | A dashboard that appears as one image has no hierarchy. |
| `pill-column-scroll` | Pill Column Scroll | — | scene | A catalog of templates shown as a static list has no 'many'. A scroll with no highlight has no choice. |
| `typewriter-brief` | Typewriter Brief | — | scene | A brief that is already on screen was never given. A brief that types with no box is just a headline. |
| `code-block-reveal` | Code Block Reveal | — | scene | A patch that is fully visible at scene start cannot be the event. |
| `phone-notification-stack` | Phone Notification Stack | — | scene | A feature announcement that is not inside a phone is a slide. Two notifications that never separate are one blob. |
| `video-well` | Video Well | — | scene | Unframed footage in a graphic ad looks like a clip dropped on a poster. The well makes it editorial. |
| `swing-ticket-rack` | Swing Ticket Rack | — | scene | Looks shown as a grid are a catalog. Looks hung on strings are merchandise. |
| `spec-band-stagger` | Spec Band Stagger | — | scene | Specs in a paragraph are not scannable. Specs in bands that arrive together are a wall. |
| `flavor-montage-to-grid` | Flavor Montage to Grid | — | scene | Six SKUs at once is a shelf. One SKU forever is a hero with no range. |
| `colorway-cycle-selector` | Colorway Cycle Selector | — | scene | A range that does not feel selectable is a poster of swatches. |
| `staggered-colorway-grid` | Staggered Colorway Grid | — | scene | A family of SKUs shown as one photo hides the range. |
| `offer-bundle-push-in` | Offer Bundle Push In | — | scene | A price without an object is a banner. An object without a push-in is a still of a box. |
| `paper-stack-panels` | Paper Stack Panels | — | scene | Two product surfaces shown side by side are a diagram. Slid past each other they become work. |
| `vertical-depth-card-carousel` | Vertical Depth Card Carousel | — | scene | A carousel that only translates X is a slider. Depth makes the deck a model. |
| `tunnel-seal-rush` | Tunnel Seal Rush | Camera & depth | scene | An opener that fades from black has no velocity. A tunnel without sequenced objects is a screensaver. |
| `hexagon-2d-to-3d` | Hexagon 2D to 3D | Camera & depth | scene | Jumping from a diagram to an unrelated 3D object breaks visual continuity. |
| `invoice-collage-scatter` | Invoice Collage Scatter | — | scene | One invoice is a document. Twelve invoices arriving from off-positions are volume. |
| `word-split-title-reveal` | Letter Rearrangement | Typography | scene | A crossfade hides letter identity; straight crossing paths make the moving letters overlap. |
| `popup-option-cycle` | Popup Option Cycle | — | scene | A settings menu that does not cycle is a screenshot. The cycle is the product behavior. |
| `odometer-percent-reveal` | Odometer Percent Reveal | — | scene | A stat that is already the final number has no claim. Ticking through nearby values makes the number an event. |
| `card-deck-fan-to-grid` | Card Deck Fan to Grid | — | scene | A grid that starts as a grid was never a deck. The fan is the editorial moment. |
| `kinetic-type-poster` | Elastic Tracking | Typography | scene | An entrance animation does not demonstrate how changing the space between letters alters the rhythm of a word. |
| `type-outline-echo` | Outline Type Echo | Typography | scene | Repeated text becomes clutter when every copy has equal weight or unrelated motion. |
| `orbital-phase-lock` | Orbital Phase Lock | Shape & rhythm | scene | Independent moving elements look arbitrary unless the viewer can perceive the relationship between their periods. |
| `wave-interference-field` | Wave Interference Field | Shape & rhythm | scene | A dense line texture feels static when its complexity has no visible cause. |
| `glyph-foundry` | Glyph Foundry | Typography | scene | Letterforms should emerge from a visible construction system. |
| `baseline-orbit` | Baseline Orbit | Typography | scene | Type needs to travel along a changing curve without losing its spacing. |
| `contour-current` | Contour Current | Typography | scene | A word should become a moving material while remaining recognizable at key moments. |
| `letter-gait` | Letter Gait | Typography | scene | Lettering should perform an action through its own structure. |
| `axis-duet` | Axis Duet | Typography | scene | Letter proportions should change the relationship between two words. |
| `trace-memory` | Trace Memory | Typography | scene | Drawing a word should expose the order and character of its strokes. |
| `lower-third-anchor` | Lower Third Anchor | Layouts | scene | Identify a subject without obscuring the main action. |
| `split-panel-handoff` | Split Panel Handoff | Layouts | scene | Two subjects need to share the frame while their hierarchy changes. |
| `tracked-callout-overlay` | Tracked Callout Overlay | Layouts | scene | An annotation must remain attached to a moving subject without covering it. |
| `orbiting-sculpture` | Orbiting Sculpture | 3D | scene | A complex form cannot be understood from one viewpoint. |
| `hinged-cube-net` | Hinged Cube Net | 3D | scene | The relationship between a flat net and a solid should remain visible. |
| `metaball-coalescence` | Metaball Coalescence | Shape & rhythm | scene | Separate forms should merge into a continuous material. |
| `match-cut-relay` | Match Cut Relay | Transitions | scene | A cut between unrelated scenes should preserve the viewer’s visual focus. |
| `volumetric-wave` | Spatial Wave | 3D | scene | A timing wave should reveal the depth and continuity of a spatial field. |
| `orbital-armillary` | Orbital Armillary | 3D | scene | Orbital alignment should remain intelligible when paths occupy different planes. |
| `contour-slice-volume` | Contour Slice Volume | 3D | scene | A volume’s cross-sections should remain recognizable while its silhouette deforms. |
| `voxel-regrouping` | Voxel Regrouping | 3D | scene | A spatial quantity should change arrangement without changing its membership. |
| `cta-cursor-click` | CTA Cursor Click | — | part | A button that lights up by itself is a hover state. A cursor that travels and presses is a decision. |
| `cursor-chip-click` | Cursor Chip Click | — | part | Suggested actions that fade in together are a menu. One chip getting clicked is a choice. |
| `light-sweep-highlight` | Light Sweep Highlight | — | part | New content that does not flash the eye is easy to miss. A full-card blink is cheap. |
| `zoom-to-control` | Zoom to Control | — | part | A dropdown that appears on a wide shot is a speck. Zooming the whole app to that control is the sentence. |
| `highlight-sweep-select` | Highlight Sweep Select | — | part | Selected text that is already highlighted was never selected. |
| `tab-walkthrough` | Tab Walkthrough | — | part | A nav that does not get walked is chrome. Hops make the path. |
| `strip-to-panel-morph` | Strip to Panel Morph | — | part | Cutting from a nav strip to a full dashboard loses the object. |
| `white-card-zoom-out` | White Card Zoom Out | — | part | A composer that was the whole world cannot suddenly sit on a desktop unless the white *is* that card. |
| `focus-click-pullback` | Focus Click Pullback | — | part | A Run/Send that is not punched is a tiny button in a wide shot. |
| `camera-push-type-on` | Camera Push Type On | — | part | A long command typed on a wide terminal is unreadable. A type-on without a push is a subtitle. |
| `progress-ring-fill` | Progress Ring Fill | Lines & data | part | Numbers alone make relative proportions hard to compare at a glance. |
| `underline-draw-accent` | Underline Draw Accent | Lines & data | part | A bolded phrase is emphasis. A drawn underline is an event on that phrase. |
| `grid-card-zoom` | Grid Card Zoom | — | part | A dashboard of many cards has no hero until the camera chooses one. |
| `led-generation-wipe` | LED Generation Wipe | — | part | A generate button that cuts to a result skips the inference. A spinner is a wait. A wipe is a process. |
| `clip-reveal-deblur` | Clip Reveal Deblur | — | part | An image that pops sharp is a JPEG. Revealing it through blur says it was made. |
| `analyzing-card-sheen` | Analyzing Card Sheen | — | part | A static 'Analyzing…' pill is a label. A breathing sheen is a running process. |
| `list-row-sweep` | List Row Sweep | — | part | Rows that fade in as blocks do not feel generated. A width sweep feels like a mask coming off. |
| `draft-to-hero-morph` | Draft to Hero Morph | — | part | Publish that cuts to a new card loses the object. The draft *becomes* the hero. |
| `stacked-card-focus-zoom` | Stacked Card Focus Zoom | — | part | A stack that never separates is one card. Focus requires a front and a behind. |
| `bulk-assign-modal` | Bulk Assign Modal | — | part | Assigning one row is a click. Assigning six at once is the product. |
| `type-as-window` | Chromatic Type Window | Typography | part | Animating the entire word undermines legibility; a static color fill can make large typography feel inert. |
| `sunburst-badge` | Sunburst Badge | — | part | A wordmark on a flat field has no world. A spinning sunburst is the world for a CPG open. |
| `concentric-ring-cta` | Concentric Ring CTA | — | part | A URL on black is a slide. Rings opening around the lockup are a close. |
| `rising-bubble-field` | Rising Bubble Field | — | part | A soda can without bubbles is a photo. Ambient rise is the material. |
| `product-tile-to-well-morph` | Product Tile to Well Morph | — | part | Hero tile cutting to a video well is two objects. Morphing the tile *into* the well is one. |
| `metric-row-stagger` | Metric Row Stagger | — | part | Rows that appear as a table have no reading order. |
| `inset-focus-relay` | Inset Focus Relay | Layouts | part | A detail needs emphasis without losing the larger scene. |
| `comparison-scan` | Comparison Scan | Layouts | part | A comparison should reveal differences without making the viewer mentally align two images. |
| `caption-safe-reflow` | Caption-safe Reflow | Layouts | part | Captions need a readable zone without covering the subject. |
| `impulse-relay` | Impulse Relay | Shape & rhythm | part | One movement should visibly cause the next rather than sharing a preset stagger. |
| `lagging-linkage` | Lagging Linkage | Shape & rhythm | part | Secondary motion should follow the leading action while connected parts remain joined. |
| `pressure-field` | Pressure Field | Shape & rhythm | part | A focal change should affect its surrounding composition through local relationships. |
| `focus-interface-typing` | Interface Typing | Focus & interaction | part | A typed label can read as a title reveal unless the viewer sees an editable field and a response. |
| `focus-cursor-path` | Cursor Path | Focus & interaction | part | A cursor crossing a busy interface is easy to lose; a permanent trail competes with its destination. |
| `focus-collaborative-cursors` | Collaborative Cursors | Focus & interaction | part | Multiple pointers become visual noise when ownership and contribution are unclear. |
| `focus-chat-turn-taking` | Chat Turn-Taking | Focus & interaction | part | Chat animation can confuse composition, sending, waiting and answering when all messages simply appear. |
| `focus-selective-blur` | Selective Blur | Focus & interaction | part | A focus effect becomes a transition gimmick when it obscures the target or moves the interface unnecessarily. |
| `caption-fade-up` | Caption Fade Up | — | motif | A caption that pops in place is a UI label. Rising 20–30px is a lower-third. |
| `weightless-bob` | Weightless Bob | Shape & rhythm | motif | A stationary object has no perceived weight; a uniform up-and-down tween feels mechanical. |
| `circular-bloom-wipe` | Circular Bloom Wipe | Transitions | motif | A cut separates two visual worlds. How can a small focal point become the next entire frame? |
| `horizontal-panel-wipe` | Horizontal Panel Wipe | Transitions | motif | A dissolve blurs the relationship between two graphic states. A moving seam can make the replacement legible. |
| `color-block-wipe` | Color Block Wipe | Transitions | motif | A transition can feel anonymous when it has no graphic relationship to the composition. |
| `logo-clip-wipe` | Logo Clip Wipe | — | motif | A logo that fades in is a still. A left→right clip is a stamp. |
| `check-pop` | Check Pop | — | motif | A check that is just there is a bullet. A check that pops is a completion. |
| `spinner-to-check` | Spinner to Check | — | motif | A spinner that never becomes a check is a hang. A check with no spinner never worked. |
| `typewriter` | Typewriter | Typography | motif | Uniform character timing feels mechanical and ignores the pauses between words and punctuation. |
| `incremental-title-states` | Incremental Title States | — | motif | A title that types with a caret is a CLI. A title that swaps full-string states is a machine. |
| `ticker-marquee` | Counter-running Marquee | Typography | motif | A single scrolling line often feels like a news ticker; inconsistent speeds or visible seams break the illusion of endless motion. |
| `pixel-twinkle` | Pixel Twinkle | — | motif | Empty corners on a title card are dead. Seeded pixels that twinkle are a field. |
| `pixel-converge` | Pixel Converge | Shape & rhythm | motif | An identity or structure needs an arrival with a clear change from disorder to order. |
| `zoom-blast` | Zoom Blast | Camera & depth | motif | A fast camera transition should preserve a focal point and resolve into a readable destination. |
| `whip-pan` | Whip Pan | Transitions | motif | A simple cut disconnects adjacent scenes, but a slow camera move drains their momentum. |
| `scroll-flicks` | Scroll Flicks | Camera & depth | motif | A smooth scroll is a tween. Discrete flicks with pauses are a person. |
| `panel-slide-in` | Panel Slide In | — | motif | A side panel that fades on top of the page has no edge. Sliding from its own width is the edge. |
| `conic-halo-pulse` | Conic Halo Pulse | — | motif | An AI control that does not glow is a normal button. A one-shot conic pulse is the affordance. |
| `press-pop` | Press Pop | — | motif | A click with no squash is a hover. Scale down then back is the finger. |
| `rule-draw` | Editorial Rule Draw | Lines & data | motif | A static divider can look arbitrary; drawing it before the title lands steals attention from the heading. |
| `editorial-wordmark-hook` | Editorial Masthead | — | motif | A wordmark that simply fades up has little character, while a spring or slam conflicts with a quiet editorial voice. |
| `shape-morph-loop` | Shape Morph Loop | Shape & rhythm | motif | Switching between disconnected shapes loses the sense that one form is changing its material state. |
| `caption-classic-subtitle` | Classic Subtitle | Typography | motif | Readers need a complete phrase that stays steady while the image continues. |
| `caption-karaoke-fill` | Karaoke Fill | Typography | motif | Readers need to follow progress inside a word without losing the rest of the line. |
| `caption-word-pop` | Word Pop | Typography | motif | A short spoken phrase needs a strong focal beat with each word. |
| `caption-paint-on` | Paint-on Caption | Typography | motif | A sentence should build with speech while leaving earlier words available to read. |
| `caption-transcript-rollup` | Transcript Roll-up | Typography | motif | Continuous narration needs recent context without an ever-growing transcript. |
| `manim-write-transform` | Manim Write & Transform | Typography | motif | Changing an equation can lose the identity of its terms and obscure the reasoning. |
| `foreground-object-wipe` | Foreground Object Wipe | Transitions | motif | A scene change needs to be motivated by something moving inside the composition. |
| `luma-contour-reveal` | Luma Contour Reveal | Transitions | motif | A reveal needs spatial ordering beyond a straight traveling edge. |
| `liquid-scene-flow` | Liquid Scene Flow | Transitions | motif | Organic scenes need a transition whose boundary participates in their movement. |
| `paper-tear-reveal` | Paper Tear Reveal | Transitions | motif | Editorial artwork needs a tactile scene handoff. |
| `pixel-scene-replacement` | Pixel Scene Replacement | Transitions | motif | Digital scenes need discrete replacement rather than another object assembly. |
| `card-flip-transition` | Card Flip Transition | Transitions | motif | A mosaic needs to reveal a different image through surface turnover. |
| `band-smear-handoff` | Band Smear Handoff | Transitions | motif | A graphic scene change needs to carry directional distortion through the edit. |
| `displacement-handoff` | Displacement Handoff | Transitions | motif | A material scene change needs a continuous distortion rather than a flat cover. |

### Aesthetics

| id | name | tag | preview | source |
|---|---|---|---|---|
| `aesthetic-vaporwave` | Vaporwave | A place in memory. | https://editframe.com/motion/aesthetics/aesthetic-vaporwave | `references/examples/aesthetic-vaporwave.tsx` |
| `aesthetic-goth` | Goth | Beauty in the shadows. | https://editframe.com/motion/aesthetics/aesthetic-goth | `references/examples/aesthetic-goth.tsx` |
| `aesthetic-edwardian` | Edwardian | Most cordially invited. | https://editframe.com/motion/aesthetics/aesthetic-edwardian | `references/examples/aesthetic-edwardian.tsx` |
| `aesthetic-beach` | Beach | Nothing on your calendar. | https://editframe.com/motion/aesthetics/aesthetic-beach | `references/examples/aesthetic-beach.tsx` |
| `aesthetic-stone` | Stone | The grain of time. | https://editframe.com/motion/aesthetics/aesthetic-stone | `references/examples/aesthetic-stone.tsx` |
| `aesthetic-glass` | Glass | Stronger in layers. | https://editframe.com/motion/aesthetics/aesthetic-glass | `references/examples/aesthetic-glass.tsx` |
| `aesthetic-swiss-editorial` | Swiss Editorial | Order, with conviction. | https://editframe.com/motion/aesthetics/aesthetic-swiss-editorial | `references/examples/aesthetic-swiss-editorial.tsx` |
| `aesthetic-memphis-play` | Memphis Play | A little more, please. | https://editframe.com/motion/aesthetics/aesthetic-memphis-play | `references/examples/aesthetic-memphis-play.tsx` |
| `aesthetic-scientific-instrument` | Scientific Instrument | Make the invisible legible. | https://editframe.com/motion/aesthetics/aesthetic-scientific-instrument | `references/examples/aesthetic-scientific-instrument.tsx` |
| `aesthetic-liquid-organic` | Liquid Organic | Nothing moves alone. | https://editframe.com/motion/aesthetics/aesthetic-liquid-organic | `references/examples/aesthetic-liquid-organic.tsx` |
| `aesthetic-retro-computing` | Retro Computing | A system coming to life. | https://editframe.com/motion/aesthetics/aesthetic-retro-computing | `references/examples/aesthetic-retro-computing.tsx` |
| `aesthetic-optical-rhythm` | Optical Rhythm | Look, then look again. | https://editframe.com/motion/aesthetics/aesthetic-optical-rhythm | `references/examples/aesthetic-optical-rhythm.tsx` |

### Timing

| id | name | use | preview | source |
|---|---|---|---|---|
| `timing-linear` | Linear | Make distance and elapsed time easy to compare. | https://editframe.com/motion/timing/linear | `references/examples/timing-linear.tsx` |
| `timing-slow` | Slow | Let a transformation feel deliberate and easy to follow. | https://editframe.com/motion/timing/slow | `references/examples/timing-slow.tsx` |
| `timing-fast` | Fast | Create urgency without reducing the time available to read the result. | https://editframe.com/motion/timing/fast | `references/examples/timing-fast.tsx` |
| `timing-cubic-in` | Cubic In | Build momentum or send an element decisively out of frame. | https://editframe.com/motion/timing/cubic-in | `references/examples/timing-cubic-in.tsx` |
| `timing-cubic-out` | Cubic Out | Bring attention into a composition with a readable landing. | https://editframe.com/motion/timing/cubic-out | `references/examples/timing-cubic-out.tsx` |
| `timing-cubic-in-out` | Cubic In / Out | Connect two stable states with a smooth, self-contained move. | https://editframe.com/motion/timing/cubic-in-out | `references/examples/timing-cubic-in-out.tsx` |
| `timing-speed-ramp` | Speed Ramp | Pass quickly through the middle while keeping both ends legible. | https://editframe.com/motion/timing/speed-ramp | `references/examples/timing-speed-ramp.tsx` |
| `timing-overshoot` | Overshoot | Suggest momentum continuing beyond an intended stopping point. | https://editframe.com/motion/timing/overshoot | `references/examples/timing-overshoot.tsx` |
| `timing-undershoot` | Undershoot | Suggest a cautious arrival or a mechanism finding its final position. | https://editframe.com/motion/timing/undershoot | `references/examples/timing-undershoot.tsx` |
| `timing-spring` | Spring | Suggest stored energy resolving through several corrections. | https://editframe.com/motion/timing/spring | `references/examples/timing-spring.tsx` |
| `timing-stepped` | Stepped | Give motion a deliberate stop-motion or discrete-update character. | https://editframe.com/motion/timing/stepped | `references/examples/timing-stepped.tsx` |
| `timing-glitchy` | Glitchy | Make continuity feel interrupted while keeping the outcome repeatable. | https://editframe.com/motion/timing/glitchy | `references/examples/timing-glitchy.tsx` |
