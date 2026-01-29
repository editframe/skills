# Video Composition Patterns

Common structural patterns for video composition with Editframe Elements.

## Core Composition Structures

### Sequential Scenes

**Pattern**: One scene after another, no overlap

```html
<ef-timegroup mode="sequence" workbench>
  <!-- Scene 1 -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="intro.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- Scene 2 -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="main.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- Scene 3 -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="outro.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

**Use for**: Clear scene separation, distinct moments, step-by-step content

---

### Crossfade Transitions

**Pattern**: Scenes overlap with fade transitions

```html
<ef-timegroup mode="sequence" overlap="1s" workbench>
  <!-- Scene 1 fades out while Scene 2 fades in -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full fade-in-out">
    <ef-video src="scene1.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full fade-in-out">
    <ef-video src="scene2.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

**Use for**: Smooth transitions, related scenes, emotional content

---

### Layered Composition

**Pattern**: Multiple elements at different z-indexes

```html
<ef-timegroup mode="fixed" duration="10s" class="absolute w-full h-full" workbench>
  <!-- Background video -->
  <ef-video src="background.mp4" class="absolute inset-0 size-full object-cover z-0"></ef-video>
  
  <!-- Overlay gradient -->
  <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
  
  <!-- Text overlay -->
  <ef-text class="absolute bottom-16 left-16 text-white text-5xl font-bold z-20">
    Your Message Here
  </ef-text>
  
  <!-- Logo -->
  <ef-image src="logo.png" class="absolute top-8 right-8 w-32 z-30"></ef-image>
</ef-timegroup>
```

**Use for**: Text over video, branded content, complex scenes

---

### Split Screen

**Pattern**: Multiple videos/elements side by side

```html
<ef-timegroup mode="fixed" duration="8s" class="absolute w-full h-full" workbench>
  <!-- Left side -->
  <ef-video src="before.mp4" class="absolute left-0 top-0 w-1/2 h-full object-cover"></ef-video>
  
  <!-- Right side -->
  <ef-video src="after.mp4" class="absolute right-0 top-0 w-1/2 h-full object-cover"></ef-video>
  
  <!-- Divider line -->
  <div class="absolute left-1/2 top-0 w-1 h-full bg-white transform -translate-x-1/2"></div>
  
  <!-- Labels -->
  <ef-text class="absolute left-1/4 top-8 text-white text-2xl">Before</ef-text>
  <ef-text class="absolute left-3/4 top-8 text-white text-2xl">After</ef-text>
</ef-timegroup>
```

**Use for**: Before/after, comparisons, dual perspectives

---

### Picture-in-Picture

**Pattern**: Small video overlaid on larger video

```html
<ef-timegroup mode="fixed" duration="10s" class="absolute w-full h-full" workbench>
  <!-- Main video -->
  <ef-video src="main.mp4" class="absolute inset-0 size-full object-cover"></ef-video>
  
  <!-- PiP video -->
  <ef-video 
    src="pip.mp4" 
    class="absolute bottom-8 right-8 w-80 h-45 rounded-lg border-4 border-white shadow-2xl"
  ></ef-video>
</ef-timegroup>
```

**Use for**: Reactions, commentary, demonstrations, interviews

---

### Text-Driven Narrative

**Pattern**: Text as primary element with supporting visuals

```html
<ef-timegroup mode="sequence" workbench>
  <!-- Statement 1 -->
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full bg-blue-600">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-6xl font-bold text-center">
      We believe in simplicity
    </ef-text>
  </ef-timegroup>
  
  <!-- Statement 2 -->
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full bg-green-600">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-6xl font-bold text-center">
      We believe in speed
    </ef-text>
  </ef-timegroup>
  
  <!-- Statement 3 -->
  <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full bg-purple-600">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-6xl font-bold text-center">
      We believe in you
    </ef-text>
  </ef-timegroup>
</ef-timegroup>
```

**Use for**: Manifesto videos, value statements, bold messaging

---

### Ken Burns Effect (Slow Zoom)

**Pattern**: Static image with slow zoom/pan

```html
<ef-timegroup mode="fixed" duration="8s" class="absolute w-full h-full" workbench>
  <ef-image 
    src="photo.jpg" 
    class="absolute inset-0 size-full object-cover animate-ken-burns"
  ></ef-image>
  
  <style>
    @keyframes ken-burns {
      from { transform: scale(1); }
      to { transform: scale(1.2); }
    }
    .animate-ken-burns {
      animation: ken-burns 8s ease-out forwards;
    }
  </style>
</ef-timegroup>
```

**Use for**: Still photos, emotional moments, documentary style

---

### Montage Sequence

**Pattern**: Rapid succession of short clips

```html
<ef-timegroup mode="sequence" workbench>
  <ef-timegroup mode="fixed" duration="1s" class="absolute w-full h-full">
    <ef-video src="clip1.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="fixed" duration="1s" class="absolute w-full h-full">
    <ef-video src="clip2.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="fixed" duration="1s" class="absolute w-full h-full">
    <ef-video src="clip3.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <ef-timegroup mode="fixed" duration="1s" class="absolute w-full h-full">
    <ef-video src="clip4.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- Continue with more clips... -->
</ef-timegroup>
```

**Use for**: Energy, variety, showing many examples quickly

---

### Persistent Background with Changing Foreground

**Pattern**: Background stays constant while foreground elements change

```html
<ef-timegroup mode="fixed" duration="15s" class="absolute w-full h-full" workbench>
  <!-- Persistent background -->
  <ef-video src="background.mp4" class="absolute inset-0 size-full object-cover"></ef-video>
  
  <!-- Changing foreground elements -->
  <ef-timegroup mode="sequence">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-5xl" duration="5s">
      Feature One
    </ef-text>
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-5xl" duration="5s">
      Feature Two
    </ef-text>
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-5xl" duration="5s">
      Feature Three
    </ef-text>
  </ef-timegroup>
</ef-timegroup>
```

**Use for**: Feature showcases, consistent branding with varied content

---

### Waveform Visualization

**Pattern**: Audio with visual waveform

```html
<ef-timegroup mode="fixed" duration="30s" class="absolute w-full h-full" workbench>
  <!-- Background -->
  <div class="absolute inset-0 bg-gradient-to-br from-purple-900 to-blue-900"></div>
  
  <!-- Audio -->
  <ef-audio src="podcast.mp3"></ef-audio>
  
  <!-- Waveform -->
  <ef-waveform 
    for="podcast.mp3"
    class="absolute bottom-0 left-0 right-0 h-32"
    style="--waveform-color: rgba(255,255,255,0.8);"
  ></ef-waveform>
  
  <!-- Speaker info -->
  <ef-text class="absolute top-16 left-16 text-white text-3xl font-bold">
    Podcast Title
  </ef-text>
</ef-timegroup>
```

**Use for**: Podcasts, audio quotes, music visualizations

---

### Captions/Subtitles

**Pattern**: Video with synchronized captions

```html
<ef-timegroup mode="fixed" duration="30s" class="absolute w-full h-full" workbench>
  <!-- Video -->
  <ef-video src="interview.mp4" class="size-full object-cover"></ef-video>
  
  <!-- Captions -->
  <ef-captions 
    for="interview.mp4"
    class="absolute bottom-16 left-16 right-16 text-white text-2xl font-bold text-center"
    style="--highlight-color: #FFD700;"
  ></ef-captions>
</ef-timegroup>
```

**Use for**: Interviews, testimonials, accessibility, social media (sound-off viewing)

---

### Logo Reveal

**Pattern**: Animated logo entrance

```html
<ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full bg-black" workbench>
  <ef-image 
    src="logo.png" 
    class="absolute inset-0 m-auto w-96 h-96 object-contain animate-logo-reveal"
  ></ef-image>
  
  <style>
    @keyframes logo-reveal {
      from { 
        opacity: 0; 
        transform: scale(0.8); 
      }
      to { 
        opacity: 1; 
        transform: scale(1); 
      }
    }
    .animate-logo-reveal {
      animation: logo-reveal 1s ease-out forwards;
    }
  </style>
</ef-timegroup>
```

**Use for**: Video openings, brand intros, transitions

---

### Feature Showcase Grid

**Pattern**: Multiple features shown in grid layout

```html
<ef-timegroup mode="fixed" duration="8s" class="absolute w-full h-full bg-gray-100" workbench>
  <!-- Grid container -->
  <div class="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-4 p-8">
    <!-- Feature 1 -->
    <div class="bg-white rounded-lg p-8 flex flex-col items-center justify-center">
      <ef-image src="icon1.png" class="w-24 h-24 mb-4"></ef-image>
      <ef-text class="text-2xl font-bold text-center">Fast</ef-text>
    </div>
    
    <!-- Feature 2 -->
    <div class="bg-white rounded-lg p-8 flex flex-col items-center justify-center">
      <ef-image src="icon2.png" class="w-24 h-24 mb-4"></ef-image>
      <ef-text class="text-2xl font-bold text-center">Secure</ef-text>
    </div>
    
    <!-- Feature 3 -->
    <div class="bg-white rounded-lg p-8 flex flex-col items-center justify-center">
      <ef-image src="icon3.png" class="w-24 h-24 mb-4"></ef-image>
      <ef-text class="text-2xl font-bold text-center">Simple</ef-text>
    </div>
    
    <!-- Feature 4 -->
    <div class="bg-white rounded-lg p-8 flex flex-col items-center justify-center">
      <ef-image src="icon4.png" class="w-24 h-24 mb-4"></ef-image>
      <ef-text class="text-2xl font-bold text-center">Reliable</ef-text>
    </div>
  </div>
</ef-timegroup>
```

**Use for**: Multiple features, benefits overview, comparison

---

### Call-to-Action End Card

**Pattern**: Final scene with clear CTA

```html
<ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full" workbench>
  <!-- Background (brand color) -->
  <div class="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"></div>
  
  <!-- Logo -->
  <ef-image 
    src="logo.png" 
    class="absolute top-16 left-1/2 transform -translate-x-1/2 w-48"
  ></ef-image>
  
  <!-- CTA Text -->
  <ef-text class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-6xl font-bold text-center">
    Get Started Today
  </ef-text>
  
  <!-- URL or action -->
  <ef-text class="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-3xl">
    www.yoursite.com
  </ef-text>
</ef-timegroup>
```

**Use for**: Video endings, driving action, brand recall

---

## Common Video Structures

### The Hook-Content-CTA Structure (30-60s)

```html
<ef-timegroup mode="sequence" overlap="0.5s" workbench>
  <!-- Hook (3-5s): Grab attention -->
  <ef-timegroup mode="fixed" duration="4s" class="absolute w-full h-full">
    <ef-video src="hook.mp4" class="size-full object-cover"></ef-video>
    <ef-text class="absolute bottom-16 left-16 text-white text-4xl font-bold">
      Tired of slow software?
    </ef-text>
  </ef-timegroup>
  
  <!-- Content (20-45s): Main message -->
  <ef-timegroup mode="sequence" overlap="0.5s">
    <ef-timegroup mode="fixed" duration="8s" class="absolute w-full h-full">
      <ef-video src="feature1.mp4" class="size-full object-cover"></ef-video>
      <ef-text class="absolute bottom-16 left-16 text-white text-3xl">
        10x faster processing
      </ef-text>
    </ef-timegroup>
    
    <ef-timegroup mode="fixed" duration="8s" class="absolute w-full h-full">
      <ef-video src="feature2.mp4" class="size-full object-cover"></ef-video>
      <ef-text class="absolute bottom-16 left-16 text-white text-3xl">
        Bank-level security
      </ef-text>
    </ef-timegroup>
    
    <ef-timegroup mode="fixed" duration="8s" class="absolute w-full h-full">
      <ef-video src="feature3.mp4" class="size-full object-cover"></ef-video>
      <ef-text class="absolute bottom-16 left-16 text-white text-3xl">
        Setup in minutes
      </ef-text>
    </ef-timegroup>
  </ef-timegroup>
  
  <!-- CTA (3-5s): Call to action -->
  <ef-timegroup mode="fixed" duration="4s" class="absolute w-full h-full bg-blue-600">
    <ef-image src="logo.png" class="absolute top-16 left-1/2 transform -translate-x-1/2 w-48"></ef-image>
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-5xl font-bold">
      Start Free Trial
    </ef-text>
    <ef-text class="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-2xl">
      www.yourproduct.com
    </ef-text>
  </ef-timegroup>
</ef-timegroup>
```

---

### The Story Arc Structure (60-90s)

```html
<ef-timegroup mode="sequence" overlap="1s" workbench>
  <!-- Setup: Introduce character/situation -->
  <ef-timegroup mode="fixed" duration="15s" class="absolute w-full h-full">
    <ef-video src="setup.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- Problem: Show the challenge -->
  <ef-timegroup mode="fixed" duration="20s" class="absolute w-full h-full">
    <ef-video src="problem.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- Solution: Introduce product/service -->
  <ef-timegroup mode="fixed" duration="25s" class="absolute w-full h-full">
    <ef-video src="solution.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- Resolution: Show success -->
  <ef-timegroup mode="fixed" duration="20s" class="absolute w-full h-full">
    <ef-video src="resolution.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  
  <!-- CTA -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full bg-brand-color">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-5xl font-bold">
      Start Your Journey
    </ef-text>
  </ef-timegroup>
</ef-timegroup>
```

---

### The Testimonial Structure (45-60s)

```html
<ef-timegroup mode="sequence" overlap="0.5s" workbench>
  <!-- Intro -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full bg-brand-color">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-4xl font-bold text-center">
      What Our Customers Say
    </ef-text>
  </ef-timegroup>
  
  <!-- Testimonial 1 -->
  <ef-timegroup mode="fixed" duration="15s" class="absolute w-full h-full">
    <ef-video src="testimonial1.mp4" class="size-full object-cover"></ef-video>
    <ef-captions for="testimonial1.mp4" class="absolute bottom-16 left-16 right-16"></ef-captions>
  </ef-timegroup>
  
  <!-- Testimonial 2 -->
  <ef-timegroup mode="fixed" duration="15s" class="absolute w-full h-full">
    <ef-video src="testimonial2.mp4" class="size-full object-cover"></ef-video>
    <ef-captions for="testimonial2.mp4" class="absolute bottom-16 left-16 right-16"></ef-captions>
  </ef-timegroup>
  
  <!-- Testimonial 3 -->
  <ef-timegroup mode="fixed" duration="15s" class="absolute w-full h-full">
    <ef-video src="testimonial3.mp4" class="size-full object-cover"></ef-video>
    <ef-captions for="testimonial3.mp4" class="absolute bottom-16 left-16 right-16"></ef-captions>
  </ef-timegroup>
  
  <!-- CTA -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full bg-brand-color">
    <ef-text class="absolute inset-0 flex items-center justify-center text-white text-5xl font-bold">
      Join Them Today
    </ef-text>
  </ef-timegroup>
</ef-timegroup>
```

---

## Best Practices

### Timing
- **Hook**: 3-5 seconds to grab attention
- **Scene duration**: 3-8 seconds per scene (varies by content)
- **Transitions**: 0.5-1s for smooth flow
- **CTA**: 3-5 seconds minimum for viewer to read and act

### Layering
- Use z-index to control stacking order
- Keep text above videos/images
- Use overlays for readability

### Responsiveness
- Use `absolute` positioning with `w-full h-full` for full-frame elements
- Use Tailwind classes for responsive sizing
- Test on different aspect ratios (16:9, 9:16, 1:1)

### Performance
- Optimize video file sizes
- Use appropriate video codecs
- Consider using images instead of video for static scenes

### Accessibility
- Always include captions for spoken content
- Ensure sufficient color contrast for text
- Don't rely solely on color to convey meaning

### Brand Consistency
- Use brand colors consistently
- Apply brand fonts throughout
- Include logo in intro/outro
- Match overall style to brand personality

## Quick Reference

| Pattern | Use Case | Complexity | Best For |
|---------|----------|------------|----------|
| Sequential Scenes | Clear separation | Low | Step-by-step, distinct moments |
| Crossfade | Smooth transitions | Low | Related scenes, emotional |
| Layered | Text over video | Medium | Branded content, overlays |
| Split Screen | Comparisons | Medium | Before/after, dual views |
| Picture-in-Picture | Dual content | Medium | Reactions, demonstrations |
| Text-Driven | Bold messaging | Low | Manifestos, statements |
| Ken Burns | Static images | Low | Photos, documentary |
| Montage | Many clips quickly | Low | Energy, variety |
| Persistent Background | Consistent branding | Medium | Feature showcases |
| Waveform | Audio visualization | Medium | Podcasts, audio |
| Captions | Accessibility | Low | All spoken content |
| Logo Reveal | Brand intro | Low | Openings, transitions |
| Feature Grid | Multiple features | Medium | Benefits, comparisons |
| CTA End Card | Drive action | Low | Video endings |

## Additional Resources

For more details on specific elements and features:
- [Timegroup documentation](timegroup.md)
- [Video element](video.md)
- [Text element](text.md)
- [Transitions guide](transitions.md)
- [CSS variables for animations](css-variables.md)
