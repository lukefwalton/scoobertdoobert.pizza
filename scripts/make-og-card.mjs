// Renders the 1.91:1 (1200×630) Open Graph / social-share card from an existing
// press photo + the storefront branding, using headless Chromium (Playwright) —
// the same render-an-image-from-markup approach as make-gifs / make-*-audio.
//
// Why: the square press photo (scoobert-og.jpg, 1200×1200) gets center-cropped by
// Twitter/X, Facebook, Slack, Discord, LinkedIn (which frame og:image at ~1.91:1),
// lopping off the raised hand / top of the head. This composes the photo into the
// correct 1200×630 frame beside the dead-plain storefront branding, so a shared
// link unfurls cleanly and on-brand.
//
// Output: public/press/scoobert-og-card.jpg (referenced by og:image/twitter:image
// in index.html + the /about pages). Re-run after changing the source photo or the
// copy:  node scripts/make-og-card.mjs
import { readFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright';

const SRC = 'public/press/scoobert-og.jpg';
const OUT = 'public/press/scoobert-og-card.jpg';
const W = 1200;
const H = 630;

const photo = `data:image/jpeg;base64,${readFileSync(SRC).toString('base64')}`;

// Period storefront card: googly-eyed face on the left (the hook), parchment +
// Times branding on the right. Copy is the real storefront voice (CLAUDE.md).
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px}
  .card{width:${W}px;height:${H}px;display:flex;
    font-family:'Times New Roman',Times,Georgia,serif;background:#f4ecd6}
  .photo{flex:0 0 588px;height:${H}px;background:#1b2a4a url('${photo}') center/cover no-repeat;
    border-right:6px solid #1b2a4a}
  .panel{flex:1;padding:50px 52px;display:flex;flex-direction:column;justify-content:center;color:#1b2a4a}
  .kicker{font-size:19px;letter-spacing:.16em;text-transform:uppercase;color:#b5341a;font-weight:bold}
  .mark{font-size:58px;line-height:.98;font-weight:bold;margin-top:16px;letter-spacing:-.01em}
  .tld{color:#b5341a}
  .tag{font-size:31px;font-style:italic;margin-top:24px;line-height:1.22}
  .sub{font-size:23px;font-style:italic;color:#586079;margin-top:10px;line-height:1.25}
  .rule{margin-top:26px;border:0;border-top:3px double #1b2a4a;width:130px}
  .foot{font-size:16px;letter-spacing:.1em;text-transform:uppercase;color:#586079;margin-top:18px;line-height:1.5}
</style></head><body>
  <div class="card">
    <div class="photo"></div>
    <div class="panel">
      <div class="kicker">&#9733; Electronic Pizza Storefront &#9733;</div>
      <h1 class="mark">scoobertdoobert<span class="tld">.pizza</span></h1>
      <p class="tag">A pizza shop off the coast of San Diego.</p>
      <p class="sub">(It is actually a solo music project by a philosopher.)</p>
      <hr class="rule">
      <div class="foot">The Best Songs Under One Roof&trade;<br>Lo-Fi &middot; Hi-Fi &middot; Stuffed Crust</div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.screenshot({ path: OUT, type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();

console.log(`wrote ${OUT} (${W}×${H}, ${(statSync(OUT).size / 1024).toFixed(0)} KB)`);
