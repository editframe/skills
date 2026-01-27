# Exaggeration Calibration

**What it does:** Determines how much to push beyond realism

### Context-Appropriate Levels

**Professional/Business:**
- 2-5% exaggeration
- Subtle scale to 1.02
- Minimal bounce
- Refined, polished

**Consumer Apps:**
- 5-15% exaggeration  
- Scale to 1.05-1.10
- Moderate bounce
- Friendly, approachable

**Playful/Games:**
- 20-50% exaggeration
- Scale to 1.20-1.50
- Aggressive bounce
- Fun, energetic

### Success Moments

**Big celebration:**

```javascript
successButton.animate([
  { transform: 'scale(1)' },
  { transform: 'scale(1.2)' },  // 20% exaggeration
  { transform: 'scale(0.95)' }, // undershoot
  { transform: 'scale(1)' }
], {
  duration: 600,
  easing: 'ease-in-out'
});
```

### Error States

**Aggressive shake:**

```javascript
errorField.animate([
  { transform: 'translateX(0)' },
  { transform: 'translateX(-20px)' },  // exaggerated left
  { transform: 'translateX(20px)' },   // exaggerated right
  { transform: 'translateX(-15px)' },
  { transform: 'translateX(15px)' },
  { transform: 'translateX(0)' }
], {
  duration: 400
});
```

### Emphasis Scale

**Subtle (professional):**
```javascript
element.animate({ transform: ['scale(1)', 'scale(1.02)'] }, { duration: 200 });
```

**Moderate (consumer):**
```javascript
element.animate({ transform: ['scale(1)', 'scale(1.10)'] }, { duration: 300 });
```

**Aggressive (playful):**
```javascript
element.animate({ transform: ['scale(1)', 'scale(1.25)'] }, { duration: 400 });
```

### Brand Personality Matching

Match exaggeration to brand voice:

- **Serious/Medical:** 1.01-1.02
- **Corporate/Finance:** 1.02-1.05
- **Tech/Startup:** 1.05-1.08
- **Social/Lifestyle:** 1.08-1.12
- **Games/Kids:** 1.15-1.30

### Readability Through Exaggeration

**Make important moments bigger:**

```javascript
// Regular list item
item.animate({ transform: ['translateY(20px)', 'translateY(0)'] }, {
  duration: 300
});

// Highlighted/important item - exaggerate motion
importantItem.animate({ transform: ['translateY(40px)', 'translateY(0)'] }, {
  duration: 400  // also longer duration
});
```

### Volume Conservation Even When Exaggerating

**Maintain physics even with cartoon motion:**

```javascript
// Exaggerated squash but conserves volume
element.animate([
  { transform: 'scaleY(1) scaleX(1)' },
  { transform: 'scaleY(0.5) scaleX(1.5)' },  // 50% squash, volume = 0.5 * 1.5 = 0.75
  { transform: 'scaleY(1) scaleX(1)' }
], { duration: 300 });
```

### When Realism Serves Better

**Skip exaggeration:**
- Data visualizations (precision matters)
- Photo galleries (don't distort images)
- Video players (realistic controls)
- Maps (spatial accuracy)
- Charts/graphs (accurate representation)

### Output

Exaggeration specification:

```
Context: Consumer social app
Brand: Friendly, approachable
Exaggeration level: Moderate (10%)
Success states: Scale to 1.15 with bounce
Errors: 20px shake amplitude
Hover: Scale to 1.05
Focus: Scale to 1.08
Overall tone: Noticeable but not cartoonish
```