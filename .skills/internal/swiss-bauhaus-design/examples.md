# Swiss / Bauhaus Design Examples

## Hero Section Variations

### Mondrian Grid Hero
```html
<section class="min-h-screen pt-16 grid grid-cols-12">
  <!-- Left accent bar -->
  <div class="hidden lg:block col-span-1 bg-[var(--destijl-blue)] border-r-4 border-black" />
  
  <!-- Main content -->
  <div class="col-span-12 lg:col-span-7 flex flex-col justify-center px-16 py-24 border-r-4 border-black">
    <h1 class="text-9xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
      Your<br />
      <span class="text-[var(--destijl-red)]">headline</span><br />
      here
    </h1>
    <div class="w-24 h-2 bg-black mb-8" />
    <p class="text-2xl font-medium max-w-xl mb-12">
      Supporting text that explains the value proposition.
    </p>
    <div class="flex">
      <a class="px-10 py-5 bg-black text-white font-bold uppercase tracking-wider border-4 border-black hover:bg-[var(--destijl-red)]">
        Primary Action
      </a>
      <a class="px-10 py-5 bg-white text-black font-bold uppercase tracking-wider border-4 border-black border-l-0 hover:bg-[var(--destijl-yellow)]">
        Secondary
      </a>
    </div>
  </div>
  
  <!-- Right geometric composition -->
  <div class="hidden lg:grid col-span-4 grid-rows-6">
    <div class="row-span-2 bg-[var(--destijl-yellow)] border-b-4 border-black" />
    <div class="row-span-3 bg-white border-b-4 border-black p-8">
      <!-- Demo or image here -->
    </div>
    <div class="row-span-1 bg-[var(--destijl-red)]" />
  </div>
</section>
```

### Asymmetric Split Hero
```html
<section class="min-h-screen grid grid-cols-12 border-b-4 border-black">
  <div class="col-span-5 bg-[var(--destijl-blue)] text-white p-16 flex flex-col justify-center">
    <p class="text-xs font-bold uppercase tracking-[0.2em] mb-4">Introducing</p>
    <h1 class="text-7xl font-black uppercase tracking-tighter leading-[0.85]">
      Product<br />Name
    </h1>
  </div>
  <div class="col-span-7 p-16 flex flex-col justify-center">
    <p class="text-2xl font-medium mb-8">
      Description of what this product does and why it matters.
    </p>
    <a class="self-start px-10 py-5 bg-[var(--destijl-red)] text-white font-bold uppercase tracking-wider hover:bg-black">
      Get Started
    </a>
  </div>
</section>
```

## Feature Sections

### Feature Grid
```html
<section class="border-t-4 border-black">
  <div class="grid grid-cols-12">
    <!-- Header -->
    <div class="col-span-12 border-b-4 border-black p-8 flex items-center gap-6">
      <div class="w-4 h-4 bg-[var(--destijl-red)]" />
      <div class="w-4 h-4 bg-[var(--destijl-yellow)]" />
      <div class="w-4 h-4 bg-[var(--destijl-blue)]" />
      <h2 class="text-4xl font-black uppercase tracking-tighter">Features</h2>
    </div>
    
    <!-- Feature items -->
    <div class="col-span-4 border-r-4 border-black p-8">
      <div class="w-12 h-12 bg-[var(--destijl-red)] mb-6" />
      <h3 class="font-bold uppercase tracking-wider mb-2">Feature One</h3>
      <p class="text-sm opacity-70">Description of the feature.</p>
    </div>
    <div class="col-span-4 border-r-4 border-black p-8">
      <div class="w-12 h-12 bg-[var(--destijl-blue)] mb-6" />
      <h3 class="font-bold uppercase tracking-wider mb-2">Feature Two</h3>
      <p class="text-sm opacity-70">Description of the feature.</p>
    </div>
    <div class="col-span-4 p-8">
      <div class="w-12 h-12 bg-[var(--destijl-yellow)] mb-6" />
      <h3 class="font-bold uppercase tracking-wider mb-2">Feature Three</h3>
      <p class="text-sm opacity-70">Description of the feature.</p>
    </div>
  </div>
</section>
```

### Sidebar Feature Section
```html
<section class="border-t-4 border-black grid grid-cols-12">
  <div class="col-span-3 bg-[var(--destijl-yellow)] border-r-4 border-black p-12 flex flex-col justify-center">
    <h2 class="text-4xl font-black uppercase tracking-tighter leading-[0.9] text-black">
      How it<br />works
    </h2>
    <div class="w-16 h-1 bg-black mt-6" />
  </div>
  <div class="col-span-9 p-12">
    <!-- Content -->
  </div>
</section>
```

## Tables

### Comparison Table
```html
<div class="border-4 border-black">
  <table class="w-full">
    <thead>
      <tr>
        <th class="text-left py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-r-4 border-black">
          Feature
        </th>
        <th class="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-r-4 border-black bg-[var(--destijl-blue)] text-white">
          Ours
        </th>
        <th class="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs border-b-4 border-black">
          Theirs
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="py-4 px-6 font-medium border-r-4 border-b-2 border-black/20">Feature name</td>
        <td class="py-4 px-6 text-center border-r-4 border-b-2 border-black/20 bg-[var(--destijl-blue)]/5">
          <div class="w-6 h-6 bg-[var(--destijl-blue)] mx-auto flex items-center justify-center">
            <svg class="w-4 h-4 text-white" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="square" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </td>
        <td class="py-4 px-6 text-center border-b-2 border-black/20">
          <div class="w-6 h-6 bg-black/10 mx-auto flex items-center justify-center">
            <svg class="w-4 h-4 opacity-30" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="square" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## Pricing Cards

```html
<div class="grid grid-cols-3">
  <!-- Basic -->
  <div class="border-4 border-black">
    <div class="p-8">
      <p class="text-xs font-bold uppercase tracking-[0.2em] mb-2">Basic</p>
      <p class="text-5xl font-black">$0</p>
      <p class="text-sm opacity-60">per month</p>
    </div>
    <div class="border-t-4 border-black p-8">
      <ul class="space-y-3 text-sm">
        <li class="flex items-center gap-3">
          <div class="w-4 h-4 bg-black" />
          Feature one
        </li>
      </ul>
    </div>
    <div class="border-t-4 border-black p-6">
      <a class="block text-center py-4 bg-white text-black font-bold uppercase tracking-wider border-4 border-black hover:bg-[var(--destijl-yellow)]">
        Get Started
      </a>
    </div>
  </div>
  
  <!-- Pro (featured) -->
  <div class="border-4 border-l-0 border-black bg-[var(--destijl-blue)] text-white">
    <div class="p-8">
      <p class="text-xs font-bold uppercase tracking-[0.2em] mb-2">Pro</p>
      <p class="text-5xl font-black">$29</p>
      <p class="text-sm opacity-60">per month</p>
    </div>
    <div class="border-t-4 border-white/30 p-8">
      <ul class="space-y-3 text-sm">
        <li class="flex items-center gap-3">
          <div class="w-4 h-4 bg-white" />
          Everything in Basic
        </li>
      </ul>
    </div>
    <div class="border-t-4 border-white/30 p-6">
      <a class="block text-center py-4 bg-white text-[var(--destijl-blue)] font-bold uppercase tracking-wider hover:bg-[var(--destijl-yellow)] hover:text-black">
        Upgrade
      </a>
    </div>
  </div>
  
  <!-- Enterprise -->
  <div class="border-4 border-l-0 border-black">
    <div class="p-8">
      <p class="text-xs font-bold uppercase tracking-[0.2em] mb-2">Enterprise</p>
      <p class="text-5xl font-black">Custom</p>
      <p class="text-sm opacity-60">contact sales</p>
    </div>
    <div class="border-t-4 border-black p-8">
      <ul class="space-y-3 text-sm">
        <li class="flex items-center gap-3">
          <div class="w-4 h-4 bg-black" />
          Everything in Pro
        </li>
      </ul>
    </div>
    <div class="border-t-4 border-black p-6">
      <a class="block text-center py-4 bg-black text-white font-bold uppercase tracking-wider hover:bg-[var(--destijl-red)]">
        Contact Us
      </a>
    </div>
  </div>
</div>
```

## Footer

```html
<footer class="border-t-4 border-black">
  <div class="grid grid-cols-12">
    <!-- Brand -->
    <div class="col-span-3 p-12 border-r-4 border-black">
      <span class="text-2xl font-black uppercase tracking-tighter">Brand</span>
      <p class="mt-4 text-sm opacity-70">
        Brief description of the company.
      </p>
    </div>
    
    <!-- Links -->
    <div class="col-span-2 p-12 border-r-4 border-black">
      <h3 class="font-bold uppercase tracking-wider text-xs mb-6">Product</h3>
      <ul class="space-y-3 text-sm">
        <li><a class="hover:text-[var(--destijl-red)]">Features</a></li>
        <li><a class="hover:text-[var(--destijl-red)]">Pricing</a></li>
      </ul>
    </div>
    <div class="col-span-2 p-12 border-r-4 border-black">
      <h3 class="font-bold uppercase tracking-wider text-xs mb-6">Company</h3>
      <ul class="space-y-3 text-sm">
        <li><a class="hover:text-[var(--destijl-red)]">About</a></li>
        <li><a class="hover:text-[var(--destijl-red)]">Blog</a></li>
      </ul>
    </div>
    
    <!-- Geometric accent -->
    <div class="col-span-5 grid grid-cols-2">
      <div class="bg-[var(--destijl-red)]" />
      <div class="bg-[var(--destijl-blue)]" />
    </div>
  </div>
  
  <!-- Bottom bar -->
  <div class="border-t-4 border-black p-6 flex justify-between items-center">
    <p class="text-xs font-bold uppercase tracking-wider">© 2026 Company</p>
    <div class="flex gap-6">
      <!-- Social icons -->
    </div>
  </div>
</footer>
```

## Form Elements

```html
<!-- Input -->
<div class="mb-6">
  <label class="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Email</label>
  <input type="email" class="w-full px-4 py-3 border-4 border-black focus:border-[var(--destijl-blue)] outline-none" />
</div>

<!-- Textarea -->
<div class="mb-6">
  <label class="block text-xs font-bold uppercase tracking-[0.2em] mb-2">Message</label>
  <textarea class="w-full px-4 py-3 border-4 border-black focus:border-[var(--destijl-blue)] outline-none resize-none" rows="4"></textarea>
</div>

<!-- Submit -->
<button class="px-8 py-4 bg-[var(--destijl-red)] text-white font-bold uppercase tracking-wider hover:bg-black">
  Send Message
</button>
```

## Testimonial Cards

```html
<div class="grid grid-cols-2">
  <div class="border-4 border-black">
    <div class="h-3 bg-[var(--destijl-red)]" />
    <div class="p-8">
      <div class="text-6xl font-black text-[var(--destijl-red)] leading-none mb-4">"</div>
      <p class="text-lg font-medium mb-8">
        Testimonial quote goes here. Keep it impactful.
      </p>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-[var(--destijl-red)]" />
        <div>
          <p class="font-bold uppercase tracking-wider text-sm">Name</p>
          <p class="text-xs uppercase tracking-wider opacity-60">Title, Company</p>
        </div>
      </div>
    </div>
  </div>
  <div class="border-4 border-l-0 border-black">
    <div class="h-3 bg-[var(--destijl-blue)]" />
    <div class="p-8">
      <div class="text-6xl font-black text-[var(--destijl-blue)] leading-none mb-4">"</div>
      <p class="text-lg font-medium mb-8">
        Another testimonial quote here.
      </p>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-[var(--destijl-blue)]" />
        <div>
          <p class="font-bold uppercase tracking-wider text-sm">Name</p>
          <p class="text-xs uppercase tracking-wider opacity-60">Title, Company</p>
        </div>
      </div>
    </div>
  </div>
</div>
```
