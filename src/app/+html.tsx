import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// The local font keeps the Figma home typography available without a third-party CDN.
export default function Html({ children }: PropsWithChildren) {
  return <html lang="ko">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <title>FLICK · 영화의 여운을 기록하다</title>
      <ScrollViewStyleReset />
      <style dangerouslySetInnerHTML={{ __html: '@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/InterVariable.woff2) format("woff2")} @font-face{font-family:Pretendard;font-style:normal;font-weight:45 920;font-display:swap;src:url(/fonts/PretendardVariable.woff2) format("woff2")} :focus-visible{outline:2px solid #F8233C;outline-offset:3px}' }} />
    </head>
    <body>{children}</body>
  </html>;
}
