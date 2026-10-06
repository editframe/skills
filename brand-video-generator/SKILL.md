---
name: brand-video-generator
description: Create brand videos from websites, supplied assets, or descriptions. Use for demos, launches, explainers, and brand films.
license: MIT
metadata:
  author: editframe
  version: "4.0"
---

# Brand Video Generator

Turn the user's message and brand materials into a video with a clear purpose and a coherent visual identity.

## Establish the task

Identify the audience, intended use, main message, and requested deliverable.
Capture explicit requirements for duration, aspect ratio, copy, assets, sound, and style.
Preserve the user's chosen direction and existing authorization.
Ask about a missing detail only when it materially changes the result.
State reasonable assumptions for other gaps.

Distinguish the video's purpose from the brand's entire identity.
A product demo can explain a familiar feature.
A brand film can sustain a mood.
A launch can lead with the product or its benefit.
Choose the structure that serves this audience and this request.

## Build an evidence base

Inspect supplied materials and relevant brand pages.
Use the user's brand kit and campaign direction when they differ from the public website.
If a source is unavailable, use other reliable materials and state the limitation.
Ask for missing material when the requested result depends on it.

Collect the evidence that affects the concept:

- The product's actual behavior, names, and relevant benefits.
- The brand's logo, palette, typography, imagery, and tone.
- The audience's situation and the problem or opportunity the video addresses.
- The source and context for claims, quotes, metrics, endorsements, and comparisons.

Separate verified facts, brand claims, creative interpretations, and unknowns.
Do not invent facts, customer quotes, product behavior, or competitor limitations.
Use exact supplied brand values when available.
Mark a substitute or approximation when the source does not support an exact match.
Do not present a recreated logo or simulated interface as an authentic asset.

Select assets for their role in the video, not a fixed asset count.
Consider resolution, crop, legibility, and whether each asset supports the intended message.
Use actual product footage when recognition or demonstrated behavior matters.
Use abstraction when it explains a relationship or supports the intended experience.

## Form the concept

Write a compact working brief when it helps organize the decisions.
Reuse an existing brief when the user supplies one.
Include the relevant decisions:

- What the viewer needs to understand, believe, feel, or do.
- Which message and evidence support that outcome.
- Which visual approach fits the brand, audience, and available materials.
- How the sequence develops, and what the ending accomplishes.
- Which assumptions or missing assets affect the result.

Show the brief when the user requests it or a substantial creative choice needs discussion.
Wait for approval when the user requests an approval step.
Otherwise, continue from the brief into the requested composition.
When a premise changes, revise the decisions that depend on it.

Consider different concepts when the direction remains open.
Compare them by clarity, brand fit, feasibility, and the intended viewer response.
Specificity can come from copy, product behavior, assets, tone, or their combination.
A concept does not need an exclusive claim or a message absent from the brand's own marketing.

## Shape the sequence

Choose what each scene contributes to the viewer's experience.
A scene can explain, demonstrate, establish context, build feeling, reinforce recognition, or provide time to absorb information.
Remove or combine scenes that add nothing the video needs.

Set pace from the content, delivery context, and intended energy.
Give demonstrations and text enough time to register.
Use cuts, holds, repetition, contrast, and transitions where they help the sequence.
Let scene count follow these decisions within the requested duration.

Connect motion to the concept without forcing every element into a literal metaphor.
Coordinate typography, composition, sound, and motion as a whole.
A common visual device can support a distinctive composition.
A quiet ending can resolve an energetic sequence.
Include a CTA when the purpose calls for one.

Select catalog studies through the motion-design skill. Adapt each study to this brief and these assets.

## Create and evaluate

Build the video as an Editframe composition.
Let Editframe control its time and media:

- Make each scene a timegroup inside a `sequence`.
- Show product footage and screen recordings in `ef-video`. Select the relevant moment with `sourcein` and `sourceout`.
- Show logos, stills, and screenshots in `ef-image`.
- Play voiceover, music, and sound cues in `ef-audio`. Place cues with `offset`, and set levels with `volume`.
- Caption speech with `ef-captions` and word-timed transcript data.
- Reveal copy with `ef-text` `split` and `stagger`.
- Export the final file from the Editframe browser editor.

Do not rebuild playback, timing, or captions with generic web code.
Use the Editframe composition skill for exact APIs and rendering options.
Use the motion-design skill for deeper motion reasoning.

Inspect the result at its intended size and pace.
Check the complete sequence as well as key frames:

- Does it deliver the requested message and include required content?
- Are factual claims supported and product depictions accurate?
- Do the assets and visual choices fit this brand and request?
- Can the viewer follow the sequence and read important text?
- Does motion direct attention without obscuring the subject?
- Does the ending serve the purpose?
- Does the output meet the requested duration, format, and delivery requirements?

Check silent playback when the delivery context requires it.
Check sound and picture together when audio carries part of the message.
Treat visual clarity without explanatory copy as a possible strength.

Simplify implementation when complexity prevents a complete, reliable result.
Preserve the user's content and delivery requirements during simplification.
Report material limitations or unverified behavior with the delivered artifact.

## Send Feedback

Send feedback to Editframe about problems and about improvements:

- If Editframe or this skill causes a problem, find a workaround and continue the task. Then report the problem and the workaround.
- If you find an improvement that can help other tasks too, not only your current task, send a suggestion. For example, suggest a clearer instruction, a missing example, a better default, or a new feature.

Send one report for each different problem or suggestion. If the report fails, continue the task.

```bash
curl -sS https://editframe.com/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EDITFRAME_API_KEY" \
  --data-binary @- <<'JSON'
{
  "category": "bug",
  "skill": "brand-video-generator",
  "summary": "One line that names the problem or the suggestion",
  "details": "For a problem: steps, expected result, actual result, and errors. For a suggestion: the change and how it helps.",
  "workaround": "The workaround that you used. Omit this field for a suggestion."
}
JSON
```

Set `category` to `bug`, `documentation`, `feature_request`, `performance`, or `other`. The API key is optional. A report without a key is anonymous. Do not put secrets, API keys, or personal data in a report. See the `editframe-api` skill for all fields, limits, and responses.
