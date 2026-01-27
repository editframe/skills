# Intent → Strategy

## Core Concept

**Message + Emotion → Motion Characteristics**

Every animation starts with intent. Before choosing timing or easing, determine what the viewer should feel and remember.

## The Intent Framework

### 1. Extract the Core Message

What's the single most important thing?

**Good intent statements:**
- "User action succeeded, continue with confidence"
- "This content is important, pay attention"
- "Loading is happening, please wait briefly"
- "These items are related and sequential"

**Bad intent statements:**
- "Make it look cool" (no communication goal)
- "Add some animation" (no purpose)
- "Fade in the elements" (mechanism, not intent)

### 2. Determine Target Emotion

The emotion directly maps to motion characteristics:

| Emotion | Timing | Easing | Material | Exaggeration |
|---------|--------|--------|----------|--------------|
| Playful | Fast (250ms) | Bounce | Rubber | High (120%) |
| Confident | Medium (400ms) | Smooth | Metal/Glass | Low (102%) |
| Calm | Slow (800ms) | Gentle | Paper/Wood | Minimal (101%) |
| Urgent | Very fast (200ms) | Sharp | Stone/Metal | None |
| Premium | Slow (600ms) | Fluid | Leather/Glass | Subtle (103%) |
| Friendly | Medium (350ms) | Slight bounce | Plastic | Moderate (105%) |

### 3. Context Modifiers

**Viewing Context:**
- Social media (mobile): Fast (200-400ms), attention-grabbing
- Explainer video: Medium (500-800ms), clear and readable
- Cinematic: Slow (1000-1600ms), dramatic
- Ads: Fast to medium, hook within 3 seconds

**Content Type:**
- Tutorial: Slower, more explanatory
- Entertainment: Fast-paced, energetic
- Documentary: Medium, measured
- Promotional: Fast, exciting

**Viewing Frequency:**
- One-time narrative: Can be longer, more detailed
- Looping content: Must loop seamlessly, can't become annoying
- Repeated branding: Very brief, memorable
- Background ambient: Subtle, non-distracting

### 4. Communication vs Decoration Test

**Ask:** If I remove this animation, does the message weaken?

**Communication** (keep):
- Directs viewer attention to key information
- Shows relationships between concepts
- Emphasizes important moments
- Guides narrative flow
- Clarifies transitions between ideas

**Decoration** (remove):
- Makes things "look pretty" without purpose
- Distracts from core message
- Adds time without adding clarity
- Becomes tiresome on repeated viewing

## Mapping Intent to Physics Model

Once intent is clear, it determines material selection:

**Intent:** User succeeded, feel confident and rewarded
→ **Emotion:** Confident + slight celebration
→ **Material:** Glass with slight rubber (mostly rigid, tiny bounce)
→ **Physics:** 400ms, 5% overshoot, ease-out

**Intent:** Loading in progress, maintain attention without anxiety
→ **Emotion:** Calm, patient
→ **Material:** Liquid (continuous, flowing)
→ **Physics:** 1400ms loop, ease-in-out, smooth

**Intent:** Error occurred, immediate attention needed
→ **Emotion:** Urgent, alerting
→ **Material:** Metal (sharp, immediate)
→ **Physics:** 400ms, sharp shake, no bounce

## Output Format

Before implementing any animation, write:

```
Intent: [What should viewer remember/feel/do?]
Emotion: [Target feeling]
Material: [Physical metaphor]
Exaggeration: [Subtle/Moderate/High]
Context: [Platform, frequency, user state]

Result: [Concrete motion characteristics]
```

**Example:**

```
Intent: Emphasize key statistic in explainer video
Emotion: Confident, clear
Material: Glass with 5% rubber bounce
Exaggeration: Subtle (103%)
Context: Explainer video, one-time viewing, general audience

Result:
- Duration: 600ms (18 frames at 30fps)
- Scale: 1 → 1.03 → 1
- Position: Slide in from right (60px)
- Easing: ease-out
```

## Common Intent Patterns for Video

### Narrative Flow Intents

**"Introducing new section"**
→ Clear transition (500-800ms), wipe or dissolve
→ Material: Paper or glass (clean, professional)

**"Key point emphasis"**
→ Scale + position (400-600ms), draws eye
→ Material: Stone (substantial) or metal (sharp)

**"Supporting information"**
→ Subtle fade-in (300-400ms), doesn't steal focus
→ Material: Paper (light, secondary)

### Brand/Title Intents

**"Logo reveal"**
→ Memorable entrance (800-1200ms), can be playful or serious
→ Material: Rubber (playful) or glass (professional)

**"Title card"**
→ Clear, readable (600-1000ms), establishes hierarchy
→ Material: Depends on brand personality

**"End card/CTA"**
→ Attention-grabbing (500-800ms), clear next action
→ Material: Metal (urgent) or glass (confident)

### Transition Intents

**"Scene change, different context"**
→ Clear break (400-600ms), wipe or cut
→ Material: Metal (sharp) or stone (definitive)

**"Scene change, same context"**
→ Smooth flow (600-800ms), dissolve or fade
→ Material: Liquid (flowing) or paper (gentle)

**"Time passage"**
→ Dissolve or clock-like (800-1200ms)
→ Material: Liquid (smooth, continuous)

## Anti-Patterns

### Intent Drift

Starting with clear intent but adding motion that contradicts it:

**Intent:** "Quick confirmation without disrupting workflow"
**Bad implementation:** 2-second celebration animation with particles

The implementation violated the intent (quick, non-disruptive).

### Multiple Simultaneous Intents

Trying to communicate several things at once:

**Bad:** Sidebar slides in WHILE content fades in WHILE header animates
**Result:** Viewer doesn't know where to look, misses all three messages

**Fix:** Sequence them. One intent at a time.

### Implied vs Stated Intent

**Implied:** "Make the button feel more premium"
**Stated:** "User should feel confident their payment is secure"

Always state intent explicitly. Implied intents drift toward decoration.
