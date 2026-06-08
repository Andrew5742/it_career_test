# Quiz Visuals

The public quiz uses SVG/CSS visual presets instead of large photos. This keeps the mobile QR flow fast, avoids heavy image downloads, and makes the visuals fit the dark cyber educational style.

## Visual Types

Choose `visual_type` in the admin quiz builder for each question:

- `frontend`: UI cards and code lines
- `backend`: server blocks and API nodes
- `fullstack`: UI plus server bridge
- `qa`: checklist and testing motif
- `ux`: wireframes and cursor-like layout
- `data`: charts and dashboard shapes
- `ai`: neural network and chip motif
- `cybersecurity`: shield and lock
- `devops`: pipeline and cloud-like flow
- `sysadmin`: terminal and monitor
- `database`: database cylinders
- `network`: connected nodes
- `embedded`: circuit board and chip
- `gamedev`: game controller and blocks
- `manager`: kanban and roadmap
- `general`: IT grid

## Why No Large Photos

Large photos would make QR quiz loading slower on school Wi-Fi and mobile internet. SVG presets are lightweight, responsive, and can be animated with CSS without adding external media dependencies.

## Future WebP Or Lottie

To add richer visuals later, keep the same `visual_type` values and map each type to a WebP or Lottie asset. Use lazy loading and preserve the current SVG fallback so the quiz still works if an asset is missing.
