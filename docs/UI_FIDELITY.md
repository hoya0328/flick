# Figma typography, geometry and vector fidelity — 2026-10-23

## Reference / scope

Figma `7o0aA5nN2muGSgSEdtsYw7`, page `0:1`:
home `1:27`, recording sheet `2:1601`, search `2:1573`, confirmation `2:1508`,
rating `2:1456`, questions `2:1288` / `2:1090`, loading `2:1074`, summary `2:951`, picker `2:753`.
Design context, node geometry and screenshots were read before implementation.

Use a 402px centered canvas on wider browsers and fluid width on narrower phones.
Figma's 62px iOS status bar and 34px home indicator are OS chrome, not web UI.
Reference content screenshots therefore use 402×779 for the 402×875 frame;
the 1000px rating artboard uses a 402×904 content viewport. Real native safe insets remain.

## Corrected contracts

| Surface | Figma-aligned implementation |
| --- | --- |
| Home header / hero | 28px symbol, 116.4×22 wordmark; 28px header; hero x21, y93, 360×557.132 at 402px |
| Home sections | 21px inset, 20px title, 20px heading-to-rail gap, 50px section gap (first 58.868px) |
| Movie / Light / Core cards | 140×200 posters; 359×371 Light card; 311×160 Core image with 227.87px card minimum |
| Popular keywords | 17.06px labels/counts, 34.12px chips, first three filled, subsequent pink outlined |
| Recording sheet | 23px top corners, 43×4 handle, 56px buttons, 13px gap, centered 20px semibold labels |
| Light header | 74px web content header; title 20px/33px, back and info SVGs with 44px controls |
| Rating | 77×111 poster, 20px headings, 18px caption, 267×51 star slider, 15px aspect chips |
| Questions | 16px progress; 132px minimum question panel; 59px tray; 36px/15px tags; original four-row positions |
| Summary | 121px movie card; 198px representative panel; 469px question panel minimum; 345px editor; 15px/20px text |
| Loading | one original 94×94 SVG, centered linear rotation, reduced-motion support preserved |

The rating slider was measured at x67.5, y386, 267×51; Next at x21, y750, 360×53
in the 402×904 content viewport, matching the Figma coordinates after OS chrome removal.
Main vertical scroll indicators are hidden to prevent Windows scrollbars consuming 14px of the artboard.
Large/custom content can grow or scroll rather than being clipped to a static mockup.

## Vectors / fonts

- UI PNG imports were removed from the requested screens. 31 original Figma SVG assets plus 3 Twemoji icons are embedded through `react-native-svg` (Expo SDK-compatible 15.15.4).
- Original viewBoxes and paths are retained; exporter-added page backplates were removed. Proportional wrapper transforms avoid stretching. Each instance namespaces SVG IDs to prevent filter collisions.
- Twemoji replaces the three expert-tag emoji layers, whose Figma SVG exports contain empty squares. Geometry/colors remain unchanged; CC BY 4.0 attribution is in Credits and the source directory.
- Pretendard and Inter are served locally. Inter is used for home section headings with Pretendard Korean fallback. SIL OFL files are shipped with the fonts.
- Movie/editorial photographs and user avatars remain image content. Quiz emoji are game content, not converted into fabricated vector artwork.

## Intentional functional differences from static Figma

Do not remove AI opt-in, privacy/spoiler controls, draft/error/recovery notices, real data provenance or accessible interaction states to make a screenshot look identical.
Real titles, authors, ratings and counts replace design samples; samples remain explicitly labeled and never invent usage counts.
Ticket scan remains a clearly explained not-yet-available action; voice and Core redesign remain out of scope.
Search helper text promises title search only, matching current API behavior. Date input remains editable ISO date text (32px) rather than a fake date picker.
Summary panels expand for long questions/custom tags; skipped questions stay visible as skipped. AI/provider/data permissions are unchanged.
OS font rasterization, device scale and real content wrapping prevent a truthful universal claim of zero-pixel difference across all devices.

## Regression and rollback

- Existing five-question/skip/change/representative-keyword/save contracts remain; no schema, auth, ownership or AI endpoint changes.
- A discovered restoration race was fixed by separating search loading from form submission loading; an abandoned search can no longer leave Save permanently busy.
- `tests/design-vectors.test.ts` verifies SVG/source parity, absence of embedded rasters/remote references, requested screen PNG removal, and canonical geometry; loading tests now verify SVG plus reduced motion.
- Rollback source: Git tag `rollback/ui-before-vector-fidelity-2026-10-23` at `f88f15f`. Restore through a reviewed revert/branch; never hard-reset or delete user changes. Existing EAS project and `beta` alias are unchanged.
