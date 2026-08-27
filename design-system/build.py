#!/usr/bin/env python3
"""Build the Claude Design bundle for bonedogstudios.com.

Reads the live site.css from the website repo and emits one self-contained
preview page per component group. Re-run after any site.css change, then
re-sync. Source of truth is always the repo, never these files.
"""

import pathlib
import re
import shutil

SITE = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(__file__).resolve().parent / "bundle"

# site.css uses root-absolute asset URLs; previews sit one level deep.
CSS = re.sub(r'url\("/assets/', 'url("../assets/', (SITE / "assets" / "site.css").read_text())


def page(path, group, name, body, pad="0"):
    """Write one preview. First line must be the @dsCard marker."""
    html = f"""<!-- @dsCard group="{group}" -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} — Bone Dog Studios</title>
<style>
{CSS}
/* preview shell only — not part of the site */
body {{ padding: {pad}; }}
.ds-note {{
  font: 500 12px/1.4 var(--body); color: var(--muted);
  letter-spacing: .08em; text-transform: uppercase;
  padding: 20px 24px 0; margin: 0;
}}
</style>
</head>
<body>
{body}
</body>
</html>
"""
    dest = OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html)


# ---------- Foundations ----------

swatches = [
    ("--bg", "#0B0B0D", "Page background"),
    ("--bg-raised", "#131316", "Cards, panels, table headers"),
    ("--bone", "#F2EBDD", "Single accent — headings, links, logo"),
    ("--ink", "#DDD7CB", "Body text"),
    ("--muted", "#A8A29A", "Secondary text, nav, footer"),
    ("--line", "rgba(242,235,221,.12)", "Hairline dividers"),
    ("--line-strong", "rgba(242,235,221,.25)", "Button borders, hover"),
]
rows = "\n".join(
    f'''    <div class="card" style="padding:0;overflow:hidden">
      <div style="height:88px;background:{v};border-bottom:1px solid var(--line)"></div>
      <div style="padding:16px 18px">
        <h3 style="font-size:.95rem;margin-bottom:4px">{n}</h3>
        <p style="font-size:.82rem;margin-bottom:6px;font-family:ui-monospace,monospace">{v}</p>
        <p style="font-size:.82rem">{d}</p>
      </div>
    </div>'''
    for n, v, d in swatches
)
page(
    "foundations/colors.html", "Foundations", "Color",
    f'''<section class="section">
  <p class="section-kicker">Foundations</p>
  <h2>Color</h2>
  <p>One accent only. Bone cream is derived from the skeleton logo and carries every
     emphasis on the site — there is no secondary brand color.</p>
  <div class="grid-3" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
{rows}
  </div>
</section>''',
)

page(
    "foundations/type.html", "Foundations", "Typography",
    '''<section class="section">
  <p class="section-kicker">Foundations</p>
  <h2>Typography</h2>
  <p>Space Grotesk for display, Inter for body — both self-hosted variable woff2.
     The site makes zero third-party requests; never introduce a font CDN.</p>
  <div style="margin-top:48px;display:grid;gap:38px">
    <div>
      <p class="ds-note" style="padding:0 0 8px">Hero h1 · Space Grotesk 600 · clamp(2.6rem, 7vw, 4.6rem)</p>
      <h1 style="font:600 clamp(2.6rem,7vw,4.6rem)/1.05 var(--display);color:var(--bone);letter-spacing:-.02em">Bone Dog Studios</h1>
    </div>
    <div>
      <p class="ds-note" style="padding:0 0 8px">Tagline · Space Grotesk 500</p>
      <p class="tagline" style="margin:0">No manual needed.</p>
    </div>
    <div>
      <p class="ds-note" style="padding:0 0 8px">Section h2 · Space Grotesk 600 · clamp(1.7rem, 4vw, 2.4rem)</p>
      <h2 style="margin:0">You&rsquo;re the customer, not the product.</h2>
    </div>
    <div>
      <p class="ds-note" style="padding:0 0 8px">Section kicker · Space Grotesk 600 · 13px · .18em · uppercase</p>
      <p class="section-kicker" style="margin:0">Ethos</p>
    </div>
    <div>
      <p class="ds-note" style="padding:0 0 8px">Body · Inter 400 · 17px/1.7</p>
      <p style="max-width:640px;margin:0">An independent studio making mobile-friendly software that is easy to
         use and intuitive. First up: /plan, a calendar for real life.</p>
    </div>
    <div>
      <p class="ds-note" style="padding:0 0 8px">Sub · Inter 400 · 1rem · muted</p>
      <p class="sub" style="margin:0 0 0">Subscriptions fund the work. That&rsquo;s the whole business model.</p>
    </div>
  </div>
</section>''',
)

page(
    "foundations/brand.html", "Foundations", "Brand & spellings",
    '''<section class="section">
  <p class="section-kicker">Foundations</p>
  <h2>Marks &amp; brand spellings</h2>
  <p>The spelling rules are not stylistic preferences — they are decisions.
     Do not normalize them to title case.</p>
  <div class="grid-3" style="margin-top:44px">
    <div class="card" style="text-align:center">
      <img src="../assets/img/bone-dog-mark.png" alt="Bone Dog Studios skeleton dog logo"
           style="width:120px;margin:8px auto 22px">
      <h3>Studio mark</h3>
      <p>Skeleton dog, shadow stripped for dark surfaces. The source PNG in the
         app repo has a baked-in shadow — never use it directly on dark.</p>
    </div>
    <div class="card" style="text-align:center">
      <img src="../assets/img/plan-mark.png" alt="/plan app logo"
           style="width:96px;margin:8px auto 22px">
      <h3>App mark</h3>
      <p>The /plan tile: blue-gradient rounded square, red calendar header,
         white grid with embedded &ldquo;/p&rdquo;.</p>
    </div>
    <div class="card">
      <h3>Spellings</h3>
      <p><strong style="color:var(--bone)">/plan</strong> — every written product mention:
         website, marketing, in-app brand surfaces.</p>
      <p><strong style="color:var(--bone)">plan</strong> — lowercase, no slash. OS surfaces
         only: launcher, store listings, window titles.</p>
      <p><strong style="color:var(--bone)">Bone Dog Studios</strong> — the studio, always title case.</p>
    </div>
  </div>
</section>''',
)

page(
    "foundations/layout.html", "Foundations", "Layout & motion",
    '''<section class="section">
  <p class="section-kicker">Foundations</p>
  <h2>Layout &amp; motion</h2>
  <div class="grid-3" style="margin-top:44px">
    <div class="card">
      <h3>Measure</h3>
      <p><strong>--max: 1080px</strong> centered. Prose blocks cap at 640px;
         legal pages at 780px.</p>
    </div>
    <div class="card">
      <h3>Rhythm</h3>
      <p>Sections pad <strong>110px</strong> vertical, <strong>72px</strong> under 860px.
         Adjacent sections are separated by a single hairline, never a gap.</p>
    </div>
    <div class="card">
      <h3>Radii</h3>
      <p>Cards <strong>12px</strong> · product card <strong>14px</strong> ·
         CTA panel <strong>16px</strong> · buttons <strong>8px</strong>.</p>
    </div>
    <div class="card">
      <h3>Reveal</h3>
      <p>Hidden state is gated on <strong>html.js</strong> so content stays visible
         with JS off, in print, and in readers. Never gate content on animation.</p>
    </div>
    <div class="card">
      <h3>Reduced motion</h3>
      <p>Every transform and transition is disabled under
         <strong>prefers-reduced-motion</strong>. The sphere goes static but stays clickable.</p>
    </div>
    <div class="card">
      <h3>Breakpoint</h3>
      <p>A single breakpoint at <strong>860px</strong>. Grids collapse to one column;
         the phone showcase drops to one screenshot.</p>
    </div>
  </div>
</section>''',
)

# ---------- Navigation ----------

page(
    "components/nav.html", "Navigation", "Header",
    '''<p class="ds-note">Default — over the hero (position: absolute)</p>
<header class="nav" style="position:static">
  <a class="brand" href="#">
    <img class="brand-mark" src="../assets/img/bone-dog-mark.png" alt="">
    Bone Dog Studios
  </a>
  <nav>
    <a href="#">/plan</a>
    <a href="#">Contact</a>
  </nav>
</header>
<p class="ds-note" style="padding-top:44px">.nav.flow — pages without a hero (legal)</p>
<header class="nav flow">
  <a class="brand" href="#">
    <img class="brand-mark" src="../assets/img/bone-dog-mark.png" alt="">
    Bone Dog Studios
  </a>
  <nav><a href="#">/plan</a></nav>
</header>
<p class="ds-note" style="padding-top:44px">Nav links are never uppercased — &ldquo;/plan&rdquo; must stay lowercase</p>''',
    pad="0 0 40px",
)

page(
    "components/footer.html", "Navigation", "Footer",
    '''<footer class="site-footer">
  <span>&copy; 2026 Bone Dog Studios LLC</span>
  <nav>
    <a href="#">admin@bonedogstudios.com</a>
  </nav>
</footer>
<p class="ds-note" style="padding-top:36px">Legal pages add privacy / terms links into the same nav</p>
<footer class="site-footer">
  <span>&copy; 2026 Bone Dog Studios LLC</span>
  <nav>
    <a href="#">Privacy</a>
    <a href="#">Terms</a>
    <a href="#">admin@bonedogstudios.com</a>
  </nav>
</footer>''',
    pad="40px 0 0",
)

# ---------- Actions ----------

page(
    "components/buttons.html", "Actions", "Buttons",
    '''<section class="section">
  <p class="section-kicker">Actions</p>
  <h2>Buttons</h2>
  <p>Two variants, no third. Outline is the default; solid is reserved for the single
     primary action on a page.</p>
  <div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:22px;align-items:center">
    <a class="btn" href="#">See what we&rsquo;re building</a>
    <a class="btn solid" href="#">Get /plan</a>
  </div>
  <p class="ds-note" style="padding:36px 0 8px">Skip link — visible only on focus</p>
  <a class="skip" href="#" style="position:static;display:inline-block">Skip to content</a>
  <p class="ds-note" style="padding:36px 0 8px">Inline link — bone on dark, underlined in legal copy only</p>
  <p style="margin:0"><a href="#">admin@bonedogstudios.com</a></p>
</section>''',
)

# ---------- Sections ----------

page(
    "components/hero.html", "Sections", "Hero",
    '''<section class="hero" style="min-height:600px">
  <div class="hero-inner">
    <img class="hero-logo" src="../assets/img/bone-dog-mark.png" alt="Bone Dog Studios skeleton dog logo">
    <h1>Bone Dog Studios</h1>
    <p class="tagline">No manual needed.</p>
    <p class="sub">An independent studio making mobile-friendly software that is easy to use
       and intuitive. First up: /plan, a calendar for real life.</p>
    <a class="btn" href="#">See what we&rsquo;re building</a>
  </div>
</section>
<p class="ds-note" style="padding:0 24px 40px">
  Live hero also layers &lt;canvas id="sphere"&gt; behind this — the inside-the-sphere
  nav constellation. hero-inner is pointer-events:none so drags reach the canvas;
  links re-enable it.
</p>''',
)

page(
    "components/feature-cards.html", "Sections", "Feature cards",
    '''<section class="section">
  <p class="section-kicker">Ethos</p>
  <h2>You&rsquo;re the customer, not the product.</h2>
  <div class="grid-3">
    <div class="card">
      <h3>No ads.</h3>
      <p>Our apps don&rsquo;t show ads. Attention is for your life, not our margins.</p>
    </div>
    <div class="card">
      <h3>Your data stays yours.</h3>
      <p>We don&rsquo;t sell data and we don&rsquo;t embed trackers. Even this website makes
         zero third-party requests.</p>
    </div>
    <div class="card">
      <h3>Pay for the product.</h3>
      <p>Subscriptions fund the work. That&rsquo;s the whole business model, and it means
         we answer to users only.</p>
    </div>
  </div>
  <p class="ds-note" style="padding:40px 0 0">
    Ethos copy stays present-tense. No &ldquo;ever&rdquo; or &ldquo;never will&rdquo; promises.
  </p>
</section>''',
)

page(
    "components/product-card.html", "Sections", "Product card",
    '''<section class="section">
  <p class="section-kicker">What we&rsquo;re building</p>
  <h2>/plan</h2>
  <a class="product-card" href="#">
    <img class="product-logo" src="../assets/img/plan-mark.png" alt="/plan app logo">
    <div>
      <p>A mobile calendar that handles your whole life: family, friends, and the business
         you run. Coming soon to the App Store and Google Play.</p>
    </div>
    <span class="go">Take a look &rarr;</span>
  </a>
  <p class="ds-note" style="padding:40px 0 0">
    Whole card is the link. Hover lifts 2px and brightens the border — suppressed under reduced motion.
  </p>
</section>''',
)

page(
    "components/cta-panel.html", "Sections", "CTA panel",
    '''<section class="section">
  <div class="cta-panel" style="margin-top:0">
    <h2>A calendar for real life.</h2>
    <p>Coming soon to the App Store and Google Play.</p>
    <a class="btn solid" href="#">Get /plan</a>
  </div>
</section>''',
)

page(
    "components/phone-showcase.html", "Sections", "Wordmark & screenshots",
    '''<section class="section">
  <p class="wordmark">/plan</p>
  <p class="sub" style="margin-left:0">A calendar for real life.</p>
  <div class="phones">
    <img class="shot" src="../assets/img/screenshots/plan-1.png" alt="/plan calendar view">
    <img class="shot" src="../assets/img/screenshots/plan-2.png" alt="/plan day view">
    <img class="shot" src="../assets/img/screenshots/plan-3.png" alt="/plan business view">
  </div>
  <p class="ds-note" style="padding:40px 0 0">
    Under 860px the grid collapses and screenshots 2&ndash;3 are hidden — one shot on small screens.
  </p>
</section>''',
)

# ---------- Content ----------

page(
    "components/legal-content.html", "Content", "Legal content",
    '''<div class="legal-content">
  <a class="back-link" href="#">&larr; Back to /plan</a>
  <h1>Privacy Policy</h1>
  <p class="effective-date">Effective 1 August 2026</p>
  <h2>What we collect</h2>
  <p>This is a specimen of the legal page styles. The live privacy and terms pages are
     launched by the shipping app — their URLs and content must not break.</p>
  <h3>Subsection heading</h3>
  <p>Body copy uses <strong>ink</strong> rather than muted, at 0.98rem, so long-form legal
     text stays readable. Inline <a href="#">links are underlined</a> here and only here.</p>
  <ul>
    <li>List items sit at 22px indent.</li>
    <li>Spacing is 8px between items.</li>
  </ul>
  <table>
    <thead><tr><th>Data</th><th>Purpose</th><th>Retention</th></tr></thead>
    <tbody>
      <tr><td>Account email</td><td>Sign-in</td><td>Life of account</td></tr>
      <tr><td>Calendar events</td><td>Core functionality</td><td>Life of account</td></tr>
    </tbody>
  </table>
  <footer>&copy; 2026 Bone Dog Studios LLC</footer>
</div>''',
)

# ---------- Assets ----------

for rel in [
    "assets/img/bone-dog-mark.png",
    "assets/img/plan-mark.png",
    "assets/img/screenshots/plan-1.png",
    "assets/img/screenshots/plan-2.png",
    "assets/img/screenshots/plan-3.png",
    "assets/fonts/space-grotesk-vf.woff2",
    "assets/fonts/inter-vf.woff2",
]:
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SITE / rel, dest)

built = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file())
print(f"{len(built)} files -> {OUT}")
for b in built:
    print(" ", b)
