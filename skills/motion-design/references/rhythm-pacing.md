# Rhythm & Pacing

Creating musical timing structure in motion.

## Skill 12: Rhythm & Pacing

**What it does:** Creates musical timing structure

### Beat Establishment

**Action → Rest → Action pattern:**

```javascript
// Establish beat
async function rhythmicSequence() {
  // Beat 1: Action (300ms)
  await element1.animate({ opacity: [0, 1] }, { duration: 300 }).finished;
  
  // Rest (200ms) - viewer processes
  await new Promise(r => setTimeout(r, 200));
  
  // Beat 2: Action (300ms)
  await element2.animate({ opacity: [0, 1] }, { duration: 300 }).finished;
  
  // Rest (200ms)
  await new Promise(r => setTimeout(r, 200));
  
  // Beat 3: Action (300ms)
  await element3.animate({ opacity: [0, 1] }, { duration: 300 }).finished;
}
```

**Consistent beat creates rhythm:**
- 300ms action + 200ms rest = 500ms beat
- Easy to predict, comfortable to watch
- Viewer unconsciously anticipates next beat

### Pattern Variation for Emphasis

**Short-short-long pattern:**

```javascript
async function emphasisPattern() {
  // Short
  await element1.animate({ opacity: [0, 1] }, { duration: 200 }).finished;
  await new Promise(r => setTimeout(r, 100));
  
  // Short
  await element2.animate({ opacity: [0, 1] }, { duration: 200 }).finished;
  await new Promise(r => setTimeout(r, 100));
  
  // Long (emphasis)
  await element3.animate({ 
    opacity: [0, 1],
    transform: ['scale(0.9)', 'scale(1)']
  }, { duration: 600 }).finished;
}
```

**Fast-fast-slow pattern:**
```javascript
// Two quick actions, one slow finale
await quickAction1(); // 150ms
await quickAction2(); // 150ms
await slowAction();   // 800ms - emphasis
```

### Rule of Thirds: Fast, Medium, Slow

**1/3 fast, 1/3 medium, 1/3 slow creates balanced pacing:**

```javascript
const totalDuration = 3000; // 3 seconds total

// Fast section (0-1000ms) - 1/3
await fastAnimations(); // 200-300ms animations

// Medium section (1000-2000ms) - 1/3  
await mediumAnimations(); // 400-500ms animations

// Slow section (2000-3000ms) - 1/3
await slowAnimations(); // 600-800ms animations
```

**Why it works:**
- Fast grabs attention
- Medium delivers content
- Slow allows processing

### Breath/Pause Timing

**Comprehension pauses:**

```javascript
async function narrativeSequence() {
  // Show title
  await title.animate({ opacity: [0, 1] }, { duration: 400 }).finished;
  
  // Breath (viewer reads title)
  await new Promise(r => setTimeout(r, 600));
  
  // Show subtitle
  await subtitle.animate({ opacity: [0, 1] }, { duration: 300 }).finished;
  
  // Breath (viewer reads subtitle)
  await new Promise(r => setTimeout(r, 800));
  
  // Show CTA
  await cta.animate({ 
    opacity: [0, 1],
    transform: ['scale(0.9)', 'scale(1)']
  }, { duration: 400 }).finished;
}
```

**Pause duration guidelines:**
- Short text (1-5 words): 400-600ms
- Medium text (6-15 words): 800-1200ms
- Long text (paragraph): 2000-3000ms
- After surprise: 1000-1500ms
- Before important moment: 500-800ms

### Syncopation and Accent Beats

**Unexpected timing for emphasis:**

```javascript
// Regular beat
await action(300); await rest(200);
await action(300); await rest(200);

// Syncopation (break the pattern)
await action(300); await rest(100);  // shorter rest
await accentAction(600);             // longer, emphasized action

// Return to beat
await rest(200);
await action(300); await rest(200);
```

**Accent beats (louder/stronger):**
```javascript
// Regular beats
element1.animate({ transform: ['translateY(20px)', 'translateY(0)'] }, { duration: 300 });

// Accent beat (2x distance = emphasis)
element2.animate({ transform: ['translateY(40px)', 'translateY(0)'] }, { duration: 300 });
```

### Tempo Matching to Music

**When background music is present:**

```javascript
const BPM = 120; // beats per minute
const beatDuration = 60000 / BPM; // 500ms per beat

// Animation durations match beat
const oneBeat = beatDuration;      // 500ms
const twoBeat = beatDuration * 2;  // 1000ms
const halfBeat = beatDuration / 2; // 250ms

// Sync animations to beat
setInterval(() => {
  // Trigger animation on each beat
  createBeatAnimation();
}, beatDuration);
```

**Subdivisions:**
```javascript
// Quarter notes (4 per measure)
const quarter = beatDuration;

// Eighth notes (8 per measure)
const eighth = beatDuration / 2;

// Sixteenth notes (16 per measure)
const sixteenth = beatDuration / 4;
```

### Building Tension

**Accelerando (speeding up):**

```javascript
async function buildTension() {
  await action(600);  // slow
  await rest(400);
  
  await action(500);  // faster
  await rest(300);
  
  await action(400);  // faster still
  await rest(200);
  
  await action(300);  // fast
  await rest(100);
  
  // Climax
  await bigAction(800);
}
```

**Increasing stagger tightness:**
```javascript
const delays = [0, 200, 350, 450, 525]; // accelerating

items.forEach((item, i) => {
  item.animate({ opacity: [0, 1] }, {
    delay: delays[i],
    duration: 300
  });
});
```

### Releasing Tension

**Ritardando (slowing down):**

```javascript
async function releaseTension() {
  await action(300);  // fast
  await rest(100);
  
  await action(400);  // slower
  await rest(200);
  
  await action(600);  // slower still
  await rest(400);
  
  // Resolution (very slow)
  await finalAction(1000);
}
```

### Rhythmic Grouping

**Group elements into phrases:**

```javascript
async function phrasedSequence() {
  // Phrase 1 (setup)
  await group1Animation(); // 600ms
  await rest(300);
  
  // Phrase 2 (development)
  await group2Animation(); // 800ms
  await rest(300);
  
  // Phrase 3 (conclusion)
  await group3Animation(); // 1000ms
  await rest(500);  // longer rest before next section
}
```

**Micro and macro rhythm:**
```javascript
// Micro rhythm (within phrase)
// 100ms action, 50ms rest, 100ms action, 50ms rest

// Macro rhythm (between phrases)
// Phrase (400ms), rest (200ms), Phrase (400ms), rest (200ms)
```

### Cadence and Resolution

**Musical sense of completion:**

```javascript
async function cadence() {
  // Rising action (tension)
  await element1.animate({ transform: ['translateY(0)', 'translateY(-20px)'] }, { duration: 400 }).finished;
  await element2.animate({ transform: ['translateY(0)', 'translateY(-40px)'] }, { duration: 400 }).finished;
  
  // Resolution (release)
  await Promise.all([
    element1.animate({ transform: ['translateY(-20px)', 'translateY(0)'] }, { duration: 600 }).finished,
    element2.animate({ transform: ['translateY(-40px)', 'translateY(0)'] }, { duration: 600 }).finished
  ]);
  
  // Final rest (completion)
  await new Promise(r => setTimeout(r, 800));
}
```

### Call and Response

**Question → Answer pattern:**

```javascript
async function callAndResponse() {
  // Call (question)
  await question.animate({ 
    transform: ['translateX(-20px)', 'translateX(0)']
  }, { duration: 400 }).finished;
  
  await new Promise(r => setTimeout(r, 200));
  
  // Response (answer)
  await answer.animate({ 
    transform: ['translateX(20px)', 'translateX(0)']
  }, { duration: 400 }).finished;
}
```

### Maintaining Interest

**Vary duration within acceptable range:**

```javascript
// Monotonous (boring)
await action(300);
await action(300);
await action(300);
await action(300);

// Varied (interesting) - but still rhythmic
await action(280);
await action(320);
await action(290);
await action(310);
```

**±10% variation keeps rhythm but adds life**

### Counting Beats

**Practical beat counting:**

```javascript
let beatCount = 0;

function onBeat() {
  beatCount++;
  
  // Every 4 beats (measure)
  if (beatCount % 4 === 0) {
    createAccentAnimation();
  }
  
  // Every 8 beats (phrase)
  if (beatCount % 8 === 0) {
    createPhraseTransition();
  }
  
  // Every 16 beats (section)
  if (beatCount % 16 === 0) {
    createSectionTransition();
  }
}
```

### Output

Rhythm & pacing specification:

```
Sequence: Product showcase
Structure: 3-act (setup, content, action)
Beat: 400ms action + 250ms rest = 650ms per beat
Pattern: Short-short-long for first 3 items, then consistent beat
Tempo: 92 BPM (matched to background music)
Phrasing: 3 groups of 4 elements each
Pauses: 600ms after each phrase
Tension build: Accelerating stagger (200ms → 150ms → 100ms)
Resolution: Final element at 800ms with 1000ms settling pause
Overall feel: Energetic but controlled, builds to clear conclusion
```
