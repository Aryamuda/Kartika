# Anti Slop UI gate

15 November 2026. Scope: local adaptation of the three SOC references supplied by Aldi. Mode: during, selected in this conversation. Direction: operator console for inspecting evidence and comparing response consequences. ENERGY 1 / RHYTHM 2 / MOTION 1. This review does not certify production deployment or physical-device accessibility.

## Hard gate

- R-02 PASS: new interface copy uses plain punctuation; no em dash added.
- R-03 PASS: checkWorkspace exercised five pages at 375, 768, 1024, 1440, 1920 px without document overflow; tables and policy graphs have bounded internal scrolling.
- R-17 PASS: metric values, incident counts, and outcomes come from API snapshots, not invented trends.
- R-18 PASS: no testimonials, fictional people, avatars, or customer endorsements added.
- R-23 PASS: reference adaptation and supplied GeoJSON were authorized; Dwirupa is the team-selected name. Province attribution and MIT license accompany the asset.
- R-24 PASS: five navigation destinations were opened in Playwright; no new destination was invented.
- R-25 PASS: CSS text checker found no failures on five pages; minimum 4.59:1. Simulation SVG text checked separately: 56 text nodes, minimum 7.10:1. Disabled controls are outside the text checker scope.
- R-26 PASS: location selection, country/focus view, clearing filters, evidence selection/retry, node filters, incident selection, mobile detail shortcut, three presets, comparison rows, and report download exercised successfully.
- R-27 PASS: evidence loading uses the shared record component; injected 404 displayed recovery; retry succeeded. Injected overview failure and reconnection succeeded. Empty filters have explicit next actions.
- R-28 PASS: no FAQ added.
- R-32 PASS: native controls retain focus outlines; keyboard focus stayed inside asset dialog and Escape closed it; mobile detail shortcut moved focus to its target.
- R-33 PASS: UI source edited directly with patches. Python was used only to transform supplied boundary data into simplified paths and retain its license.
- R-34 PASS: one fixed operator theme, already documented in DESIGN.md; no theme toggle advertised.
- R-35 PASS: production build, 14 frontend tests, workspace and live simulator browser checks passed; desktop/mobile screenshots inspected. Positive replay/reset was not rerun in this UI pass.
- R-36 PASS: simulation remains explicitly declarative; no latency, packet loss, sensor synchronization, or packet validation claim added.
- R-37 PASS: direction and dials declared before editing, based on DESIGN.md and the supplied references.
- R-38 PASS: synthetic environment and locations are labeled; no fabricated operational data added.
- R-39 PASS: native named controls used; token field has a visible label; map has equivalent location buttons; selected rows expose aria-pressed; reduced motion verified.
- R-40 PASS: SVG maps reserve their aspect ratio; fonts are local; no new third-party script/media/font request. Build size is measured by Vite; no Web Vitals result claimed.

## Purpose gate

- R-01 PASS: existing green neutral palette retained for continuity; amber/red represent API-derived attention and severity. No gradient added.
- R-04 PASS: existing action/object SVG icons reused; no decorative emoji or generic AI symbol added.
- R-06 PASS: platform font supports offline use; monospace is limited to comparable identifiers, addresses, and time.
- R-07 PASS: no decorative background grid.
- R-08 PASS: existing arrows indicate opening an incident or evidence; none added as generic decoration.
- R-09 PASS: badges represent severity, service state, and replay state; tactic labels come from incident evidence.
- R-10 PASS: no glass or backdrop blur.
- R-12 PASS: panels stay flat; existing modal shadow separates the active dialog.
- R-13 PASS: no glow effect added; map pin outline marks an actual location.
- R-14 PASS: A/B/C presets retain equal structure for comparison. Operator panels have different layouts because their content and decisions differ.
- R-19 PASS: color transitions only; no endless animation; reduced-motion setting disables transitions.
- R-22 PASS: province geometry gives location context; no unrelated illustration added.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 2 / MOTION 1 matches quiet, varied operator panels and restrained transitions.
- Focal points PASS: incident queue on Operations, selected evidence on Investigation, response consequences on Simulation.
- Spacing PASS: compact metric strip, divided workspace panels, and wider consequence sections separate different tasks.
- Accent PASS: green identifies current navigation, selected evidence, and primary actions; warning colors carry security state.
- Identity PASS: Dwirupa name, WIB times, asset IDs, evidence provenance, and A/B/C response language recur across the workspace.
- Design Read PASS: operator console for security analysts, using the existing data-dense direction and supplied SOC references.

## Craftsmanship and consistency

- C-1 / R-31 PASS: major decisions and their reasons recorded in DESIGN.md.
- C-2 PASS: changed controls exercised through the browser checks listed above.
- C-3 / R-05 PASS: composition follows location filtering, evidence inspection, and response comparison; no marketing-template section added.
- C-4 PASS: five viewport widths, keyboard dialog behavior, reduced motion, evidence errors, and connection recovery exercised.
- C-5 PASS: evidence and simulation values remain API-derived; geographic simplification and synthetic locations disclosed.
- R-11 PASS: small panel/control radii preserved; no blanket pill styling.
- R-15 / R-16 PASS: actions name their outcome in Indonesian; no AI marketing claims added.
- R-20 PASS: workflow is specific to cross-source investigation, provenance, and declared-policy simulation.
- R-21 PASS: fixed dark operator theme has its audience/context reason recorded in DESIGN.md.
- R-29 PASS: neutral green surfaces and one primary accent; amber/red reserved for meaningful states.
- R-30 PASS: references adapted to existing API behavior and accessibility constraints; screenshot text, fabricated metrics, and window decorations were not copied.

## UI supplement

- PASS (pembaruan Operasi): peta menjadi fokus tengah pada desktop dan konten pertama pada ponsel; pemeriksaan posisi panel dan rasio geografis setelah resize lulus di lima lebar. Ringkasan serta antrean dipindah tanpa mengubah data/API. Build, 14 tes dan workspace browser check kembali lulus tanpa pageerror.

- PASS: palette, accent, radius, elevation, and motion follow documented purposes.
- PASS: no decorative emoji, status light, grid, glow, glass, eyebrow badge, or filler chart added.
- PASS: location/incident/evidence selection is real; no new inactive control.
- PASS: five existing destinations remain reachable on mobile; active destination has weight and an edge marker as well as color.
- PASS: honest synthetic labels, source text, failure states, and recovery controls retained.
- PASS: responsive panels, keyboard shortcuts, reduced motion, and sized vector content checked within the scope above.

Pending release work: commit/push authorization, deployment, physical phone test, and a fresh hosted smoke check. These are not claimed complete by this local UI gate.
