---
description: "Category-specific structural truths, false differentiators, and visual specificity examples for brand video generation."
metadata:
  author: editframe
  version: 0.45.8
---


# Brand Examples and Category Guidance

Use this reference when you need concrete illustrations of the protocol operations. The examples here show what each operation looks like applied to specific categories — not templates to copy.

---

## Structural Truths (Operation 1 examples)

What makes a structural truth non-transferable:

**Software/developer tools**
- "Their entire product is built on a single unified object model — the same object in the risk system is the same object in the connect system and billing system; no translation layer." (payments API)
- "They removed the 'new file' concept entirely — there are no saved files, only shareable URLs." (browser-native design tool)
- "Issues that enter triage exit resolved — no ambiguous state, no 'in review forever'." (opinionated issue tracker)
- "You retain full database access — row-level security written in standard SQL, realtime via database replication, queryable with any standard client." (backend-as-a-service built on an existing database)

**Consumer/lifestyle**
- "They launched with no advertising — only photos submitted by real customers, which meant the product had to be worth photographing before it could be marketed." (community-built beauty brand)
- "Every product is tested by the founder on herself for a minimum of 6 months before it ships."

**Physical goods / apparel**
- "They don't sell seasons — they sell repairs. Their website earns revenue from used items, not just new." (repair-first outdoor apparel brand)
- "The product is designed to be returned in the same bag it arrived in, zero-waste, no box."

**Food / beverage**
- "They publish their supply chain — not as PR, but because the flavor differs by farm and harvest, and they name the farm on the bag."

---

## Formal Constraints (Operation 2 examples)

What a structural truth forces on video mechanics:

- Opinionated removal (issue tracker that eliminates workflow ambiguity): "Each scene removes one element until only the essential thing remains." The structure (subtraction) is the argument (constraints enable).
- Invisible product (payments API where the product is the plumbing): "The video shows the product by showing its absence — everything working without friction."
- Brand built from user faces (community-first beauty brand): "The video is structured as a handoff — each face passes the screen to the next, as if the product is passing between real people."
- Repair over replacement (anti-consumption apparel brand): "The structure is reversal — damaged → restored — every scene runs against the usual product-fantasy direction."

**Test**: State the constraint as "This video argues [X] by showing [Y]." If [Y] could illustrate a different argument, the form is not embodying the argument.

---

## False Differentiators (Operation 1 — what to ignore)

These describe every competitor in the category. They are not structural truths.

**Universal**
- "Easy to use", "powerful", "fast", "reliable", "all-in-one"
- "Helps teams work better", "saves time", "increases productivity"
- "Trusted by thousands of companies"

**Developer/API brands**
- "Instant deploys", "edge functions", "OAuth built in", "REST API", "100ms response times", "99.99% uptime", "zero config", "batteries included"

**Payment/fintech**
- "One platform", "global payments", "secure transactions", "invisible infrastructure", "end-to-end payments"

**Design tools**
- "Design and code together", "design faster", "multiplayer design", "browser-based", "files keep you apart"

**Workspace/productivity**
- "Fragmented tools → unified workspace", "all-in-one", "where work happens", "write, plan, organize"

**Deployment platforms**
- "Deploy on every git push", "preview URLs", "instant deploys", "global CDN", "serverless", "zero config", "git push → live", "instant rollback"

**Backend-as-a-service**
- "Firebase alternative", "open source", "integrated platform", "one backend for everything"

**Consumer beauty/skincare**
- "Clean ingredients", "dermatologist-tested", "for all skin types", "cruelty-free", "glow", "your skin but better"

**Lifestyle/apparel**
- "Sustainable", "made with care", "designed for real life", "premium quality", "built to last", "timeless style"

**Food/beverage**
- "Real ingredients", "no artificial anything", "small batch", "crafted with love", "farm to table", "ethically sourced"

**Fitness/wellness**
- "Feel your best", "stronger every day", "your journey", "science-backed", "community-driven"

**The brand's marketing tagline is never the answer.** Find the structural truth underneath.

Category-specific dig patterns:
- Developer brands: what does this product ask developers to *give up*? (conventions, configurations, files) — that trade-off is the actual truth.
- Design tools: what workflow step did this product eliminate that all predecessors required?
- Workspace tools: what is the specific unit of information this product invented? (the block, the issue, the formula)

---

## Visual Specificity (Operation 7 examples)

What "prove visually" looks like by category:

### Product-demo (developer/API) specificity

Generic labels (e.g., "Secure payments", "Intelligent risk") fail. Show instead:
- Actual code snippets with the product's real API syntax
- The product's recognizable UI components
- Real terminal output, JSON responses, SDK patterns developers would recognize
- Named features/concepts unique to this product: its specific workflow constructs, component model, or access patterns

Generic patterns that fail the competitor substitution test: command palettes (now ubiquitous), kanban boards, unified workspace, real-time collaboration nodes.

### Problem/pain scene specificity

For tech products, the pain must be the pain THIS product specifically replaced:

- **Browser-native design tool**: Show the filename-versioning hell of file-based design ('Final_v3_FINAL_real.sketch'), the email-attachment-feedback loop, 'someone overwrote my artboard'
- **Opinionated issue tracker**: Show the legacy tool's 47-field issue creation form, the 'which board is this?' confusion across 12 open tabs, notification spam from issue references, the sprint ceremony that produces no actionable output
- **Unified payments API**: Show the pre-API architecture — multiple vendor SDKs with incompatible object models (a transaction object in one SDK ≠ an account object in another ≠ a score object in a third), the middleware translation layer, the actual code comparison (50 lines of vendor-specific glue code vs. 3 lines)

### Community/identity brand specificity

When the brand truth involves real people or community:
- Abstract human representations (circles, gradient blobs, silhouettes, generic avatars) are prohibited
- Use `ef-image` with actual photography, or `ef-video` with real faces
- For canvas: draw recognizable facial features with variation — or use the product itself as visual subject
- If you cannot show real people, do not claim community. Claim something visually provable instead.
- Placeholder attribution handles (@user, @reader, @customer, @reader_1) are prohibited — use named sources or design without attribution

### Physical goods / apparel specificity

For brand marks and product shapes:
- If the brand has a recognizable logo silhouette, it must appear as actual geometry in canvas — not a generic category shape
- For a mountain-logo outdoor brand: the specific mountain silhouette from their logo is mandatory. For product shapes: use bezier curves for the actual garment silhouette (distinctive shoulder yoke, chest pocket placement, horizontal quilting of a puffer) — `fillRect()` is prohibited for clothing
- For waste/environmental scenes: show recognizable garment shapes being discarded, not abstract shapes. The viewer should think "that's my jacket."

### Consumer beauty specificity

Named products, not categories:
- Use the brand's actual product names and shade names — not generic category words like 'blush' or 'brow gel'
- Brand's actual taglines and campaign copy verbatim — not invented equivalents
- Community artifacts by name — not generic handles

---

## Emotional State Arc (Operation 5 examples)

Specific emotional movements by category:

**SaaS/developer**: "Like this problem is finally solved" | "Like building again is possible"
**Consumer beauty**: "Like they already belong to something before they've bought anything"
**Apparel**: "Like buying less is somehow an act of defiance they want to be part of"
**Food**: "Like they've been eating anonymous food their whole life and just found out it has a name"

---

## Generic Visual Defaults to Replace

| Concept | Generic default | What to find instead |
|---------|-----------------|----------------------|
| Chaos/Complexity | Tangled bezier curves | What does chaos look like for THIS product's users specifically? |
| Collaboration | Converging dots, connecting lines | What does collaboration look like in THIS product's actual interface? |
| Order/Simplicity | Grid layouts | What does resolution look like in THIS product's own UI or workflow? |
| Scale | Grid multiplication | What unit does THIS brand scale — requests, users, lines of code? Show that unit. |
| Speed | Motion blur | What is the before/after latency THIS brand eliminates? Show the gap. |
| Growth | Upward arrows | What grows specifically to THIS brand? |
| Connection | Network nodes | What specific things connect through THIS product that didn't before? |
| Transformation | Before/after morph | What is the named "before" state THIS brand's own users describe? |
| Environmental waste | Abstract particles/shapes | Recognizable objects being discarded with actual product-specific texture |
| Human faces | Circles, gradients, blobs | Actual facial features, real photography, or product as stand-in |

---

## Community-Driven Brands

**The verification requirement**: When a brand claims community co-creation, the video must reference *verifiable* community artifacts, not plausible reconstructions.

**Wrong**: Generic feedback quotes that sound like real customers ('I wish there was a product that...')
**Right**: Named sources with verifiable provenance (specific blog post, Reddit thread, documented product origin story with dates and named publication)

**Example (community beauty brand built from a blog)**: The structural truth isn't 'we listen to feedback' — every DTC brand claims this. The structural truth is that the brand's editorial platform existed for years before the first product launched, building documented demand. The video must reference this specific artifact: the platform's name, the year span, the specific community moments that led to specific named products. If you cannot verify the specific community moment, do not fabricate a plausible-sounding quote — note the gap instead.
