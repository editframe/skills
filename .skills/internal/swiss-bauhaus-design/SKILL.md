---
name: swiss-bauhaus-design
description: Apply sophisticated Bauhaus and Swiss typography-inspired design principles. Use when redesigning pages, creating landing pages, styling documentation, or when user mentions Swiss design, Bauhaus, geometric design, clean typography, or modernist aesthetics.
---

# Swiss / Bauhaus Design System (Refined)

This design system captures the **spirit** of Bauhaus and International Typographic Style - not a literal recreation of De Stijl or Mondrian paintings.

## Core Philosophy

The goal is **sophistication through restraint**, not "geometric shapes everywhere."

**Key principles:**
- **White space is structure** - Generous margins, breathing room
- **Typography creates hierarchy** - Not color blocks
- **Color is accent** - Used sparingly for maximum impact
- **Shadows add depth** - Subtle, like ink bleeding on paper
- **Gradients add warmth** - Subtle, not flat digital perfection

## Common Mistakes to Avoid

### 1. Color Block Overload
**Wrong:** Every section has a red/blue/yellow sidebar
**Right:** Use color blocks once or twice per page as dramatic accents

### 2. Border Obsession
**Wrong:** 4px black borders on everything
**Right:** Subtle 1px rule lines, shadows for depth

### 3. Uppercase Everything
**Wrong:** ALL CAPS on every heading and label
**Right:** Mixed case, use caps sparingly for labels

### 4. Repetitive Patterns
**Wrong:** Same color-sidebar + content layout for every section
**Right:** Vary layouts - some centered, some split, some full-width

### 5. No Visual Rest
**Wrong:** Dense grid of colored boxes
**Right:** Generous padding, let content breathe

## Color Palette

```css
:root {
  /* Sophisticated, not primary-school */
  --accent-red: #C41E3A;      /* Crimson, not fire engine */
  --accent-blue: #1E3A8A;     /* Navy, not primary blue */
  --accent-gold: #B8860B;     /* Dark gold, not yellow */
  --ink-black: #1a1a1a;       /* Soft black */
  --paper-white: #FAFAFA;     /* Warm white */
  --warm-gray: #78716C;       /* For secondary text */
}

.dark {
  --accent-red: #DC2626;
  --accent-blue: #3B82F6;
  --accent-gold: #F59E0B;
  --paper-white: #0a0a0a;
  --ink-black: #e5e5e5;
}
```

**Rules:**
- Primary colors are **accents**, not backgrounds
- Use warm grays for secondary text
- Gradients are allowed (subtle, for depth)
- Shadows are allowed (soft, like ink on paper)

## Typography

**Font:** Inter, or similar geometric sans-serif

```css
body {
  font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
```

**Hierarchy through weight and size, not just color:**

```html
<!-- Section label - small, uppercase, colored -->
<p class="text-sm font-semibold text-[var(--accent-red)] uppercase tracking-wider mb-4">
  The difference
</p>

<!-- Section heading - large, bold, normal case -->
<h2 class="text-4xl md:text-5xl font-bold tracking-tight mb-6">
  Before & after
</h2>

<!-- Body text - warm gray, relaxed leading -->
<p class="text-lg text-[var(--warm-gray)] leading-relaxed">
  Description text here.
</p>
```

## Shadows & Depth

Use soft shadows that feel like ink bleeding on paper:

```css
/* Light shadow - for cards */
.shadow-print {
  box-shadow: 
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 8px rgba(0,0,0,0.04),
    0 8px 16px rgba(0,0,0,0.02);
}

/* Medium shadow - for elevated elements */
.shadow-print-lg {
  box-shadow: 
    0 2px 4px rgba(0,0,0,0.03),
    0 8px 16px rgba(0,0,0,0.05),
    0 16px 32px rgba(0,0,0,0.03);
}
```

## Borders

Use subtle rule lines, not heavy borders:

```css
/* Subtle border */
.border-rule {
  border-color: rgba(0,0,0,0.12);
}
.dark .border-rule {
  border-color: rgba(255,255,255,0.12);
}
```

```html
<!-- Section divider -->
<section class="py-24 border-t border-rule">
```

## Layout Principles

### 1. Generous White Space
- Sections: `py-24` (6rem vertical padding)
- Max width: `max-w-7xl mx-auto px-6`
- Let content breathe

### 2. Varied Compositions
Don't repeat the same pattern. Mix:

```html
<!-- Centered heading + content below -->
<section class="py-24">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center max-w-2xl mx-auto mb-16">
      <h2>Heading</h2>
    </div>
    <div>Content</div>
  </div>
</section>

<!-- Side-by-side with text left -->
<section class="py-24">
  <div class="max-w-7xl mx-auto px-6">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div>Text content</div>
      <div>Visual content</div>
    </div>
  </div>
</section>

<!-- Full-width dark section -->
<section class="py-24 bg-[var(--ink-black)] text-white">
  <div class="max-w-7xl mx-auto px-6">
    Content
  </div>
</section>
```

### 3. Color Accents (Sparse)
Color should punctuate, not dominate:

```html
<!-- Accent line under heading -->
<div class="w-16 h-1 bg-[var(--accent-gold)] mb-8" />

<!-- Colored label before heading -->
<p class="text-sm font-semibold text-[var(--accent-red)] uppercase tracking-wider mb-4">
  The difference
</p>

<!-- Accent gradient on card top -->
<div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue)]/50" />

<!-- ONE dramatic colored section per page (CTA) -->
<section class="py-32 bg-accent-blue text-white">
```

## Component Patterns

### Navigation
Clean, not bordered:

```html
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-rule">
  <div class="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
    <a href="/" class="text-xl font-extrabold tracking-tight">brand</a>
    <div class="flex items-center gap-8">
      <a href="/docs" class="text-sm font-medium text-[var(--warm-gray)] hover:text-[var(--ink-black)]">Docs</a>
    </div>
  </div>
</nav>
```

### Cards
Subtle shadow, optional accent line:

```html
<div class="relative bg-white rounded shadow-print overflow-hidden">
  <!-- Optional: colored accent line -->
  <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-blue)]/50" />
  
  <div class="p-8">
    Content
  </div>
</div>
```

### Buttons
Primary and secondary variants:

```html
<!-- Primary -->
<a href="#" class="px-8 py-4 bg-[var(--ink-black)] text-white font-semibold text-sm rounded shadow-print hover:shadow-print-lg transition-shadow">
  Primary action
</a>

<!-- Secondary -->
<a href="#" class="px-8 py-4 border border-rule font-semibold text-sm rounded hover:bg-black/5 transition-colors">
  Secondary action
</a>

<!-- Accent -->
<a href="#" class="px-5 py-2 bg-accent-red text-white text-sm font-semibold rounded hover:opacity-90">
  Get Started
</a>
```

### Code Blocks
Dark background, syntax highlighting with accent colors:

```html
<div class="bg-[#1a1a1a] rounded-lg overflow-hidden shadow-print-lg">
  <!-- Window chrome -->
  <div class="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
    <div class="w-3 h-3 rounded-full bg-[#ff5f57]" />
    <div class="w-3 h-3 rounded-full bg-[#febc2e]" />
    <div class="w-3 h-3 rounded-full bg-[#28c840]" />
    <span class="ml-4 text-xs text-white/50">filename.tsx</span>
  </div>
  
  <pre class="p-6">
    <code class="text-sm font-mono text-white/90">...</code>
  </pre>
</div>
```

Syntax highlighting colors:
- Keywords: `var(--accent-red)`
- Tags/Components: `var(--accent-blue)`  
- Attributes/Numbers: `var(--accent-gold)`
- Strings: `emerald-400`
- Comments: `opacity-50`

## Print Texture (Subtle)

Add warmth without going skeuomorphic:

```css
/* Paper texture - very subtle */
.texture-paper {
  background-image: url("data:image/svg+xml,...");
  /* opacity: 0.02 */
}

/* Text ink effect - slight blur */
.text-ink {
  text-shadow: 0 0 0.3px currentColor;
}

/* Gradient backgrounds for depth */
.bg-accent-blue {
  background: linear-gradient(135deg, var(--accent-blue) 0%, color-mix(in srgb, var(--accent-blue), black 10%) 100%);
}
```

## Dark Mode

Invert structure, keep accent colors similar:

```css
/* Light */
background: #FAFAFA;
text: #1a1a1a;
borders: rgba(0,0,0,0.12);

/* Dark */
background: #0a0a0a;
text: #e5e5e5;
borders: rgba(255,255,255,0.12);
/* Accents slightly brighter for contrast */
```

---

## Documentation Styling Guidelines

For documentation and utility pages, apply the design system with **reduced intensity**:

### Toned-Down Adjustments for Docs

1. **Borders**: Use `border-2` maximum instead of `border-4`
2. **Typography**: Use `font-bold` instead of `font-black` for headings
3. **Uppercase**: Reserve for small labels only, not navigation
4. **Hard shadows**: Replace with subtle `shadow-print` or simple 2px offsets
5. **Color accents**: One accent color per section maximum, muted tones

### Docs-Specific Components

**Tables** - Clean but structured:
```html
<table class="w-full">
  <thead>
    <tr class="border-b-2 border-[var(--ink-black)] dark:border-white">
      <th class="text-left py-3 px-4 font-bold text-sm">Property</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-rule hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
      <td class="py-3 px-4">...</td>
    </tr>
  </tbody>
</table>
```

**Sidebar Navigation** - Structured with subtle accents:
```html
<nav class="text-sm">
  <!-- Active item uses accent underline or left border -->
  <a class="flex items-center gap-2 px-3 py-2 font-medium text-[var(--ink-black)] border-l-2 border-[var(--accent-blue)]">
    Active item
  </a>
  <a class="flex items-center gap-2 px-3 py-2 text-[var(--warm-gray)] hover:text-[var(--ink-black)] border-l-2 border-transparent">
    Inactive item
  </a>
</nav>
```

**Buttons** - Squared but not aggressive:
```html
<!-- Primary docs button -->
<a class="inline-flex items-center px-4 py-2 bg-[var(--ink-black)] dark:bg-white text-white dark:text-black text-sm font-semibold">
  Action
</a>

<!-- Secondary/outline -->
<a class="inline-flex items-center px-4 py-2 border-2 border-[var(--ink-black)] dark:border-white text-sm font-semibold hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black">
  Secondary
</a>
```

**Code/property names** - Use accent color:
```html
<code class="font-mono text-sm text-[var(--accent-blue)] dark:text-[var(--accent-blue)]">propertyName</code>
```

**Badges/tags** - Squared, subtle:
```html
<span class="inline-flex px-2 py-0.5 text-xs font-semibold bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
  read-only
</span>
```

## Implementation Checklist

When applying this design system:

- [ ] Use warm, muted accent colors (not pure primaries)
- [ ] Add generous white space (py-24 between sections)
- [ ] Use subtle shadows instead of heavy borders
- [ ] Vary section layouts (don't repeat same pattern)
- [ ] Use color accents sparingly (1-2 per page)
- [ ] Mix typography weights and cases
- [ ] Add subtle gradients for depth
- [ ] Use rule-line borders (1px, low opacity)
- [ ] Only one dramatic colored section (usually CTA)
- [ ] Cards use shadows, optional accent line at top

### For Documentation specifically:

- [ ] Reduce border thickness (2px max)
- [ ] Use font-bold not font-black
- [ ] Squared buttons but not aggressive
- [ ] Accent colors for links and code
- [ ] Clean tables with 2px header border
- [ ] Sidebar uses left-border for active state
