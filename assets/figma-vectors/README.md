# Figma vector sources

File `7o0aA5nN2muGSgSEdtsYw7`, exported 2026-10-23 as SVG at the user's request.
Home: frame `1:27`; Light: section `2:453`.

Files preserve the exported vector paths, colors, transforms, effects and intrinsic viewBox.
Only the exporter-added canvas/ancestor backplates and page clip wrappers were removed
to make the UI icons transparent (no shape tracing or bitmap conversion).
`src/features/design/vector-assets.ts` embeds the same XML for Metro/web/native parity.
`DesignVector` keeps the original SVG canvas and proportionally scales a wrapper;
monochrome tinting is used only for inactive/selected states. Instance IDs are namespaced
so repeated SVG filters cannot collide.

Film/editorial photography and user avatars remain content images, not interface assets.
Historical PNG exports are retained for rollback but are no longer imported as UI icons.
Fonts are served locally under `public/fonts`; Pretendard and Inter use SIL OFL licenses.

The Figma emoji text layers export as empty squares. `clapper.svg`, `camera.svg`,
and `theatre.svg` use Twitter Twemoji originals (CC BY 4.0), with intrinsic 36×36 canvases.
See `TWEMOJI-LICENSE.txt` and the in-app Credits screen for attribution.
