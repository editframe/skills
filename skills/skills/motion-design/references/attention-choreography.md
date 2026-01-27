# Attention Choreography

**What it does:** Plans the sequential flow of viewer focus

## The Golden Rule

**ONE FOCUS AT A TIME**

Human attention is a spotlight, not a floodlight. Multiple simultaneous motions = confusion and missed messages.

## Creating Attention Hierarchy

**Primary focus:**
- Largest motion range
- Highest contrast
- First in sequence
- The thing that must be seen

**Secondary focus:**
- Supports primary
- Smaller motion
- Lower contrast
- Comes after primary settles

**Tertiary focus:**
- Background elements
- Ambient motion only
- Never competes with primary/secondary

## Attention Budget

**Information per second:**
- Mobile: 1 concept per 2 seconds
- Desktop: 1 concept per 1.5 seconds  
- Presentation: 1 concept per 3-4 seconds

Pack more = viewer misses content

## Sequencing Rules

```
1. Establish context (background fades in)
   ↓ Wait 200-400ms
2. Introduce main element (hero image scales in)
   ↓ Wait until motion completes + 300ms
3. Add supporting elements (text fades in)
   ↓ Wait until motion completes + 200ms
4. Show actions (buttons fade in)
```

**Never skip the waits.** Attention needs time to shift.

**Pseudo-code pattern:**
```
sequence:
  animate(background, fadeIn, 400ms)
  wait(300ms)
  animate(hero, scaleIn, 600ms)
  wait(400ms)
  animate(text, fadeIn, 400ms)
  wait(200ms)
  animate(button, scaleIn, 300ms)
```

## Staging Scenes

```
Scene 1: Context
- Background
- Container structure
Duration: 400ms + 300ms rest

Scene 2: Focus
- Primary content
- Hero element
Duration: 600ms + 400ms rest

Scene 3: Details
- Supporting text
- Metadata
Duration: 400ms + 200ms rest

Scene 4: Actions
- Buttons
- Next steps
Duration: 300ms + rest until user acts
```

## Hold Times for Comprehension

- Short text (1-5 words): 800ms
- Paragraph: 2-3 seconds
- Complex graphic: 3-4 seconds
- After surprise moment: 1-2 seconds

People need time to process what they see.

## Testing Attention Flow

Ask: "If I blur my vision, what moves?"
- Only one thing? ✅ Good
- Multiple things? ❌ Revise—sequence them

## Output

Timeline document:
```
0ms:     Background fades in (400ms)
400ms:   [REST - viewer sees empty canvas]
700ms:   Hero scales in (600ms, ease-out)
1300ms:  [REST - viewer sees hero]
1700ms:  Title slides in (400ms, ease-out)  
2100ms:  [REST - viewer reads title]
2500ms:  Subtitle fades in (300ms)
2800ms:  [REST - viewer reads subtitle]
3200ms:  CTA button scales in (300ms, bounce)
```

Every element gets dedicated attention time.

**Visual timeline:**
```
Background  |████████|
           ↓ rest
Hero              |████████████|
                 ↓ rest
Title                        |████████|
                             ↓ rest
Subtitle                              |██████|
                                      ↓ rest
Button                                       |██████|
```
