# TrustNear — D0 Brand Foundation

**Status:** locked 2026-05-25
**Owner:** Vikas
**Replaces:** navy-blue + gold (old MVP palette)
**Goal:** premium "wow on open" + warm + trustworthy for home services

---

## 1. Color System — "Plum × Coral × Pearl"

Aubergine primary + sunset coral accent + pearl cream background. No Indian home-services
competitor owns this palette (UC = pink, Yes Madam = blue, Snabbit = navy, Pronto = orange).
Conveys **luxury hospitality** with warmth — exactly the "I'd let this person in my home"
feel a verified-pros marketplace needs.

### 1.1 Core tokens

| Token                             | Hex       | Role                                                     |
| --------------------------------- | --------- | -------------------------------------------------------- |
| `brand.DEFAULT` / `brand.800`     | `#3D1F4E` | Hero surfaces, primary buttons, header bg                |
| `brand.900`                       | `#22102F` | Deep wells, modal overlays, dark hero gradient end       |
| `brand.700`                       | `#4F2A66` | Pressed state, gradient mid                              |
| `brand.600`                       | `#6B3B85` | Lighter hero gradient start                              |
| `brand.500`                       | `#8B53A8` | Decorative accents, chart series                         |
| `brand.400`                       | `#AF7BCB` | Light backgrounds, badge bg                              |
| `brand.300`                       | `#CDA3E0` | Hover surfaces                                           |
| `brand.200`                       | `#E2C8EF` | Tinted backgrounds                                       |
| `brand.100`                       | `#F0DFF8` | Subtle highlights                                        |
| `brand.50`                        | `#F8EEFC` | Sectional backgrounds                                    |
| `accent.DEFAULT` / `accent.500`   | `#FF7A5C` | Coral — CTAs, verified badges, ETA chips, prices         |
| `accent.600`                      | `#E55A3C` | Pressed coral                                            |
| `accent.400`                      | `#FF9881` | Light coral                                              |
| `accent.300`                      | `#FFB6A4` | Soft coral tint                                          |
| `accent.100`                      | `#FFE3DA` | Coral wash bg                                            |
| `accent.50`                       | `#FFF3EE` | Sectional bg                                             |
| `support.DEFAULT` / `support.500` | `#F5C76A` | Butter — sparingly: stars, premium tier, success accents |
| `support.300`                     | `#FAE0A6` | Light butter                                             |
| `support.100`                     | `#FDF1D5` | Butter wash                                              |
| `surface.DEFAULT`                 | `#FFFFFF` | Cards                                                    |
| `surface.muted`                   | `#FAF6F1` | Pearl screen bg                                          |
| `surface.subtle`                  | `#F4EEE7` | Section dividers                                         |
| `ink.DEFAULT`                     | `#1A1226` | Body text (warm near-black, NOT pure black)              |
| `ink.muted`                       | `#5B4868` | Secondary text                                           |
| `ink.subtle`                      | `#9C8DB0` | Tertiary text, placeholders                              |
| `ink.inverse`                     | `#FAF6F1` | Text on dark surfaces                                    |
| `border.DEFAULT`                  | `#EAE3DA` | Card borders, dividers                                   |
| `border.strong`                   | `#D6CCBE` | Input borders                                            |
| `success`                         | `#2D7A4F` | Confirmations                                            |
| `warning`                         | `#C77A1A` | Pending states                                           |
| `danger`                          | `#C2362A` | Errors, cancel                                           |

### 1.2 Tier badges (Trust Score)

Cleaner system — coral family for non-premium, butter for top tier, plum for elite.

| Tier       | Color     | Hex       |
| ---------- | --------- | --------- |
| `none`     | gray      | `#9C8DB0` |
| `bronze`   | warm tan  | `#B07C4A` |
| `silver`   | cool gray | `#94A3B8` |
| `gold`     | butter    | `#F5C76A` |
| `platinum` | plum      | `#6B3B85` |

### 1.3 Gradient recipes

| Name          | Use                             | CSS                                                              |
| ------------- | ------------------------------- | ---------------------------------------------------------------- |
| `hero`        | Top of customer home, splash    | `linear-gradient(135deg, #4F2A66 0%, #3D1F4E 60%, #22102F 100%)` |
| `coral-cta`   | Premium primary CTAs            | `linear-gradient(135deg, #FF9881 0%, #FF7A5C 100%)`              |
| `butter-glow` | "Top expert" rings, achievement | `linear-gradient(135deg, #FAE0A6 0%, #F5C76A 100%)`              |
| `pearl-card`  | Featured tile background        | `linear-gradient(180deg, #FFFFFF 0%, #FAF6F1 100%)`              |

### 1.4 Dark mode (D9 deferred)

Token flips: surface→#1A1226, surface.muted→#22102F, brand→#AF7BCB (lighten),
accent→#FF9881 (lighten), ink→pearl. Plum/coral identity stays; only luminosity flips.

---

## 2. Typography

**Display + body:** `Plus Jakarta Sans` (700/600/500/400) — premium SaaS personality
(Linear, several fintechs), softer than Inter, more refined than DM Sans.
**Numerals:** Same family with tabular nums for prices/timers.
**Hindi support:** `Noto Sans Devanagari` as fallback.

Load via expo-google-fonts. NativeWind `font-display` for headings, `font-sans` for body.

### 2.1 Type scale

| Token      | Size | Line | Letter      | Use                     |
| ---------- | ---- | ---- | ----------- | ----------------------- |
| `display`  | 34px | 40px | -0.6px      | Splash hero, big totals |
| `h1`       | 28px | 34px | -0.4px      | Screen titles           |
| `h2`       | 22px | 28px | -0.3px      | Section titles          |
| `h3`       | 18px | 24px | -0.2px      | Card titles             |
| `bodyLg`   | 16px | 24px | 0           | Primary body            |
| `body`     | 15px | 22px | 0           | Default body            |
| `small`    | 13px | 18px | 0           | Captions, meta          |
| `caption`  | 11px | 14px | 0.4px       | Labels, micro UI        |
| `overline` | 11px | 14px | 1.5px UPPER | Section ribbons         |

### 2.2 Weight rules

- Display/h1/h2: **800 ExtraBold** for hero, **700 Bold** for sections
- h3, bodyLg: **600 SemiBold**
- body, small: **500 Medium** (more readable than 400 on mobile)
- caption/overline: **600 SemiBold**

---

## 3. Spacing, Radius, Shadow, Motion

### 3.1 Spacing scale (4px base, generous)

`xs=4 sm=8 md=12 lg=16 xl=20 2xl=24 3xl=32 4xl=40 5xl=56 6xl=72`

Screen edge gutter: `xl` (20px). Section block spacing: `3xl` (32px) above title,
`xl` (20px) between cards.

### 3.2 Radius

| Token   | Px  | Use                               |
| ------- | --- | --------------------------------- |
| `xs`    | 6   | Chips, small badges               |
| `sm`    | 10  | Inputs, buttons                   |
| `md`    | 14  | Inline cards                      |
| `card`  | 18  | Standard cards (was 16)           |
| `xl`    | 22  | Hero tiles, featured cards        |
| `sheet` | 28  | Bottom sheets (was 24)            |
| `pill`  | 999 | Tags, avatars, segmented controls |

### 3.3 Shadow

Subtle, warm-tinted (NOT cool blue-gray default):

| Token      | Spec                                                                  |
| ---------- | --------------------------------------------------------------------- |
| `card`     | `0 2px 8px rgba(61, 31, 78, 0.06), 0 1px 2px rgba(61, 31, 78, 0.08)`  |
| `floating` | `0 8px 24px rgba(61, 31, 78, 0.12), 0 2px 6px rgba(61, 31, 78, 0.08)` |
| `hero`     | `0 20px 50px rgba(34, 16, 47, 0.25)`                                  |

### 3.4 Motion (D9)

- Entry stagger: 80ms between siblings
- Tap scale: 0.96 over 120ms ease-out
- Page transition: 280ms ease-out
- Haptic: light on tap, success on confirm, warning on error

---

## 4. Mascot — "Sevak" (TrustNear Helper)

**Brief:** a friendly, slightly stylized 3D character — adult Indian, warm smile,
neutral build, NOT cartoonishly exaggerated (avoid Toing's chibi look — we want
"premium" friendly, not "kid friendly" friendly).

Wears category-themed apron/uniform in each variant. Same face/body, different
outfits — like Duolingo's owl variants.

### 4.1 Base mascot prompt (Midjourney / Adobe Firefly / DALL-E)

```
3D character render, friendly Indian helper named Sevak, warm smile, mid-30s,
medium-brown skin tone, short neat black hair, neutral height/build, wearing
deep plum (#3D1F4E) apron with small coral (#FF7A5C) trim. Soft studio
lighting, isolated on transparent or pearl background (#FAF6F1). Pixar-Disney
hybrid style, premium not childish, clean lines, no logos or text. Centered,
full body, 3/4 angle, slight forward lean as if welcoming. 4K, octane render.
```

### 4.2 Variant prompts (one per key screen)

| Variant         | Prompt addition                                                              | Use in screen                       |
| --------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| **Greeter**     | "...waving hello with right hand, left hand by side"                         | Splash, welcome screen              |
| **Locator**     | "...holding a glowing pin/map marker in palm, looking down at it"            | Location permission                 |
| **Notifier**    | "...cupping a small bell next to ear, head tilted listening"                 | Notification permission             |
| **Verifier**    | "...holding clipboard with checkmark, thumbs up"                             | OTP / verification success          |
| **Cleaner**     | "...wearing yellow rubber gloves, holding microfiber cloth and spray bottle" | Home Cleaning category              |
| **Plumber**     | "...wearing tool belt, holding pipe wrench"                                  | Plumbing / Repairs                  |
| **Electrician** | "...wearing safety goggles, holding multimeter and small toolbox"            | Electrical                          |
| **Beautician**  | "...holding small makeup brush and cosmetics tray"                           | Beauty & Wellness                   |
| **Trainer**     | "...in athletic wear, holding small dumbbell, energetic pose"                | Fitness/Lifestyle                   |
| **Celebrator**  | "...arms raised, confetti around, joyful smile"                              | Booking confirmed, payout success   |
| **Resting**     | "...sitting cross-legged on cushion, peaceful smile"                         | Empty states (no bookings, no jobs) |
| **Searcher**    | "...holding magnifying glass to eye, curious expression"                     | Search empty / no results           |
| **Apologizer**  | "...sheepish smile, one hand behind head"                                    | Errors, 404, payment failed         |

### 4.3 Mascot delivery checklist

Generate each variant in:

- 1024×1024 PNG with transparent bg (for general use)
- 1024×1024 PNG with pearl bg (#FAF6F1) (for hero panels)
- @2x and @3x for retina

Store at: `apps/customer/assets/mascot/<variant>@2x.png` (same in pro app).
Naming: `sevak-greeter.png`, `sevak-cleaner.png` etc.

### 4.4 Lottie animations (D9)

For the same set, optional Lottie versions for:

- Greeter waving (loop)
- Verifier checkmark stamp (one-shot)
- Celebrator confetti burst (one-shot)
- Apologizer head-tilt (loop)

Source via LottieFiles or convert from After Effects after PNG approval.

---

## 5. Illustration & icon system

### 5.1 Icons

Continue with **Ionicons** for consistency. NEW: introduce **Phosphor Icons** (regular weight)
as secondary for richer visual variety in feature tiles — Phosphor has more "premium" icon
shapes than Ionicons' flat outlines. Install via `phosphor-react-native`.

### 5.2 Category illustrations

Each leaf category gets a **dedicated illustration** (not just icon):

- 240×240 PNG, flat illustration matching brand palette
- Shows the service visually (e.g., cleaning = woman wiping table, plumbing = hands fixing tap)
- Indian context (saree-clad customer, Indian apartment, etc.)
- Use Storyset or commission custom on Fiverr at ~₹500/illustration

### 5.3 Empty state illustrations

15 illustrations needed (one per empty state):

- No bookings yet, No active jobs, No experts in area, Search no results, No reviews yet,
  Wallet empty, Notifications empty, Saved addresses empty, Help no results, FAQs empty,
  Payouts empty, Bookings completed, Refer & earn intro, Maintenance mode, Offline mode

Pair with mascot "Resting" or "Searcher" variant as appropriate.

---

## 6. Category copy (rich descriptions)

For each category, define:

- **Tagline** (≤7 words)
- **Description** (2-3 sentences, what & why)
- **Includes** (3-5 bullet items)
- **Starting from** (₹)
- **Avg duration**
- **Trust signals**

These power the new rich category tiles on home + category detail screens.

### 6.1 PARENT — Home Care

- Tag: _Cleaning, sanitization & pest control by trained pros_
- Desc: Spotless homes without the planning. Background-verified cleaners arrive
  with their own kit — eco-friendly supplies, fresh microfibers, no surprise charges.
  One tap, fixed price, satisfaction guarantee.
- Includes: Home cleaning · Deep clean · Pest control · Sanitization
- Starting: ₹299 · Trust: Police-verified · Insured · Re-do free if not happy

### 6.2 Home Cleaning (leaf)

- Tag: _Weekly + monthly cleaning, kit included_
- Desc: A familiar face every week. Same cleaner remembers your home, your style,
  your preferences. Bring-their-own cleaning kit. Pause anytime.
- Includes: Sweep + mop all rooms · Dust surfaces & furniture · Bathroom clean
  · Kitchen counter & stove · Bed making
- Starting: ₹299/visit · Duration: 60-90 min · Trust: Same cleaner option · Background-verified

### 6.3 Deep Clean

- Tag: _Move-in / move-out scrub, every corner_
- Desc: For when "regular" isn't enough. Steam-cleaned bathrooms, degreased kitchen,
  scrubbed grout, polished fixtures. Ideal before guests, after renovation, before
  shifting in or out.
- Includes: Bathroom tile + grout scrub · Kitchen chimney + appliances · Cabinet
  interiors · Window glass + frames · Floor polish
- Starting: ₹1,499 (1 BHK) · Duration: 4-6 hrs · Trust: 2-person team · Premium chemicals

### 6.4 Pest Control

- Tag: _Cockroach, termite, mosquito treatment_
- Desc: Government-approved chemicals applied by licensed technicians. Family-safe
  formulations — kids and pets can return after 1 hour. Includes follow-up visit
  for resistant infestations.
- Includes: Pre-inspection · Gel + spray treatment · Crack sealing · Safety briefing
  · 30-day warranty (re-treat free)
- Starting: ₹599 · Duration: 45-90 min · Trust: Licensed · Pet-safe · Warranty

### 6.5 Sanitization

- Tag: _Hospital-grade disinfection_
- Desc: Electrostatic spray with WHO-approved disinfectants. Kills 99.9% of viruses
  & bacteria on contact. Office-grade equipment, residential pricing.
- Includes: All surfaces fogging · Door handles + switches · Soft furnishings
  · Air vents · Certificate provided
- Starting: ₹899 (1 BHK) · Duration: 30-60 min · Trust: WHO-approved chemicals · Certificate issued

### 6.6 PARENT — Repairs

- Tag: _On-demand plumbing, electrical, AC & appliance fixes_
- Desc: A small leak today is a big bill tomorrow. Licensed technicians arrive in
  under 90 minutes with diagnostic tools and common parts. Pay only for what's fixed.
- Includes: Plumbing · Electrical · AC service · Appliance repair
- Starting: ₹149 visit · Trust: Licensed · Parts at MRP · 30-day repair warranty

### 6.7 Plumbing

- Tag: _Leaks, taps, RO, geyser fixes_
- Desc: Most homes have a leak slowly raising the bill. Our plumbers diagnose,
  quote upfront, fix in one visit when possible. Original parts at MRP — never marked up.
- Includes: Leak detection · Tap + mixer · WC + flush · Geyser + RO · Drain unblocking
- Starting: ₹149 visit + parts · Duration: 30-90 min · Trust: Licensed · MRP parts · 30-day warranty

### 6.8 Electrical

- Tag: _Wiring, fans, inverter, switchboard_
- Desc: Faulty wiring is the #1 cause of home fires in India. Our certified
  electricians follow BIS standards, use insulated tools, test every circuit.
- Includes: Switch + socket · Fan installation · Inverter wiring · MCB + RCCB
  · Light fixtures
- Starting: ₹199 visit · Duration: 30-120 min · Trust: BIS-certified · Insurance covered

### 6.9 AC Service

- Tag: _Service, gas, installation_
- Desc: A serviced AC uses 25% less power. Deep-clean filters & coils, top up gas
  if needed, leak test, performance check. Old or new, split or window.
- Includes: Filter + coil clean · Drain + condenser · Gas pressure check
  · Anti-bacterial spray · Performance report
- Starting: ₹499/AC · Duration: 45-60 min · Trust: All brands · 15-day post-service warranty

### 6.10 Appliance Repair

- Tag: _Fridge, washing machine, microwave_
- Desc: Don't replace — repair. Genuine spares, brand-trained technicians, transparent
  diagnostic before any work. Save ₹15,000+ on what a new unit would cost.
- Includes: Fridge · Washing machine · Microwave · Chimney · Dishwasher · Geyser
- Starting: ₹299 diagnostic · Duration: 60-180 min · Trust: Brand-trained · Genuine parts

### 6.11 PARENT — Beauty & Wellness

- Tag: _Salon, spa & grooming at your doorstep_
- Desc: Skip the salon queue. Trained professionals arrive with sterilized tools,
  single-use disposables, and salon-grade products. Privacy of your home, quality
  of a premium salon.
- Includes: Salon at home · Spa & massage · Hair & makeup · Men's grooming
- Starting: ₹299 · Trust: Sterilized tools · Single-use disposables · Brand products

### 6.12 Salon at Home (Women)

- Tag: _Waxing, threading, facials, pedicure_
- Desc: Your salon, your couch. Sterilized tools, fresh disposables every appointment,
  premium product brands (Lotus, O3+, VLCC). Privacy, comfort, salon quality.
- Includes: Waxing (full body / parts) · Threading · Facials · Cleanup · Mani-pedi
  · Hair spa
- Starting: ₹299 · Duration: 30-180 min · Trust: Premium products · Sterile tools · Women only

### 6.13 Spa & Massage

- Tag: _Deep tissue, relaxation, prenatal_
- Desc: Trained therapists, professional table, scented oils. Choose Swedish for
  relaxation, deep tissue for soreness, prenatal for safe care.
- Includes: Swedish · Deep tissue · Aromatherapy · Foot reflexology · Prenatal
  (specialist) · Couples (2 therapists)
- Starting: ₹999/hr · Duration: 60-120 min · Trust: Certified therapists · Hygiene-first · Female/male option

### 6.14 Hair & Makeup

- Tag: _Bridal, party, photoshoot looks_
- Desc: Industry-trained makeup artists for your big day. Pre-trial available,
  HD-camera-ready, all-day-stay formulations. Bridal packages include hair, makeup,
  saree draping.
- Includes: Bridal package · Party makeup · Engagement · Reception · Photoshoot
  · Saree draping
- Starting: ₹1,499 · Duration: 60-180 min · Trust: HD-ready · Pre-trial available · Top artists

### 6.15 Men's Grooming

- Tag: _Haircut, beard styling, facials_
- Desc: Salon-trained barbers come to you. Fresh towels, sterilized clippers,
  brand-grade products. Subscription option for monthly upkeep at 15% off.
- Includes: Haircut · Beard trim + styling · Facial · Cleanup · Head massage
  · Pedicure
- Starting: ₹299 · Duration: 30-90 min · Trust: Trained · Hygiene-first · Subscription saves 15%

### 6.16 PARENT — Lifestyle

- Tag: _Trainers, tutors & photographers for everyday upgrades_
- Desc: Fitness, learning, memories — at home. Verified professionals come to your
  schedule, your space. Try a single session before committing.
- Includes: Fitness trainer · Yoga · Photography · Home tutor
- Starting: ₹399 · Trust: Verified · Single-session trial · No long contracts

### 6.17 Fitness Trainer

- Tag: _At-home personal training_
- Desc: Personalized workout plans, weekly progress tracking, no gym needed.
  Certified trainers — strength, fat loss, post-injury, senior fitness.
- Includes: Goal assessment · Workout plan · Progress tracking · Nutrition basics
  · Form correction
- Starting: ₹499/session · Duration: 45-60 min · Trust: Certified · Try 1 session · Female/male option

### 6.18 Yoga

- Tag: _Hatha, vinyasa, prenatal_
- Desc: Trained yoga instructors come to your living room. Style match — hatha for
  beginners, vinyasa for flow, prenatal with specialist certification.
- Includes: Style selection · Mat-free option · Breathing practice · Meditation
  · Posture correction
- Starting: ₹399/session · Duration: 45-60 min · Trust: Certified · Prenatal-safe · Group available

### 6.19 Photography

- Tag: _Baby, family, anniversary, events_
- Desc: Professional photographer, your moment. Indoor or outdoor, full edit suite
  included, raw + final images delivered in 5 days.
- Includes: Pre-shoot consult · 100-200 edited shots · Raw files · Online gallery
  · Print-ready resolution
- Starting: ₹3,999 · Duration: 90-180 min · Trust: Portfolio reviewed · Edits included

### 6.20 Home Tutor

- Tag: _K–12 school subjects, competitive prep_
- Desc: Subject-expert tutors come home. Match by board (CBSE/ICSE/State), class,
  subject. Monthly tracker, parent updates, demo class free.
- Includes: Demo class free · Customized plan · Weekly tests · Parent reports
  · Doubt sessions
- Starting: ₹499/hr · Duration: 60-90 min · Trust: Board-matched · Background-verified

---

## 7. Information architecture — key screens

### 7.1 Customer onboarding (D2)

```
[Splash] Sevak (Greeter) + tagline + "Get started" CTA
   ↓
[Welcome carousel] 3 slides:
  • Find verified pros in 30s          (Sevak Searcher)
  • Booked. Done. Guaranteed.          (Sevak Verifier)
  • Pay after service                   (Sevak Celebrator)
   ↓
[Permission: Notifications] Sevak Notifier illustration + WHY + Allow / Not now
   ↓
[Phone] +91 input → "Send OTP"
   ↓
[OTP] 6-digit auto-detect + resend timer
   ↓
[Profile] Name + optional email (with progress dots: ●●○○)
   ↓
[Permission: Location] Sevak Locator + WHY + Allow precise/approx
   ↓
[Address] Search or map pin + label (Home/Work/Other)
   ↓
[Tabs/Home] Sevak Celebrator brief overlay + "Welcome, Vikas"
```

Progress dots persist top-right through OTP→Profile→Location→Address (4 steps).

### 7.2 Customer home (D3)

```
┌────────────────────────────────────────────┐
│ [hero gradient: plum]                      │
│ Good evening, Vikas        🔔  👤           │
│ 📍 Office, Shakti Nagar      ▾              │
│                                            │
│ [search "Try beauty, plumbing…"]    [mic]  │
│                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [pearl bg]                                 │
│ TOP VERIFIED PROS NEAR YOU         see all │
│ ⊙ ⊙ ⊙ ⊙ ⊙ ⊙ ⊙   ← round avatars + ★rating │
│ Anita Pooja Ram  Sara …                    │
│                                            │
│ WHAT YOU NEED                              │
│ ┌─────────┬─────────┐                       │
│ │ HOME    │ REPAIRS │   parent tiles      │
│ │ CARE    │         │   with rich copy +  │
│ │ desc    │ desc    │   illustration      │
│ │ ₹299↑   │ ₹149↑   │                     │
│ └─────────┴─────────┘                       │
│ ┌─────────┬─────────┐                       │
│ │ BEAUTY  │ LIFE    │                     │
│ │ desc    │ desc    │                     │
│ └─────────┴─────────┘                       │
│                                            │
│ [banner carousel — promo cards]           │
│                                            │
│ LIVE IN YOUR AREA                          │
│ 🟢 12 cleaners available now               │
│ 🟢 4 plumbers within 2km                   │
│                                            │
│ TRENDING THIS WEEK                         │
│ horizontal scroll: leaf categories         │
│                                            │
│ FROM OUR CUSTOMERS                         │
│ 3 testimonial cards (review + photo +     │
│ name + service used)                       │
└────────────────────────────────────────────┘
```

Round avatars (top experts strip) are the **signature element** — like Toing's "Popular
Brands" but for humans. Each avatar: 76×76 circular photo, 12px ring (butter gradient if
top-tier), small ★ badge bottom-right with rating.

### 7.3 Category detail (D4)

```
[hero plum] ← arrow  [category name]  ♡
[mascot variant for category]
[Tagline + rich description]

[Includes section — bullet list with checkmarks]

[How it works — 3 step horizontal scroll with mini illustrations]
  1. Pick time → 2. Pro arrives → 3. Pay after

[FAQs — accordion]

[Bottom sheet: pros in area]
  Filter chips: ✓ verified  ★ 4.5+  💰 ₹299-999
  Pro cards (vertical list):
    [avatar] Name + ★rating + experience + ETA + ₹ + [BOOK]
```

### 7.4 Expert detail (D4)

```
[hero plum, slightly compressed]
[avatar large] [name, tier badge] [verified ✓]
★ 4.8 (327 reviews)  ·  3 yrs exp  ·  Hindi/English

[stats strip]
   234        12 km        15 min
   Jobs       Avg distance  Avg arrival

[About]
[Services & prices]
[Recent reviews]
[Portfolio (if applicable)]

[Sticky bottom] [BOOK NOW]
```

### 7.5 Pro onboarding (D6)

```
[Splash] Sevak (Greeter) + "Earn on your terms" + Get started
   ↓
[Welcome carousel] 3 slides:
  • Set your own schedule           (Sevak Resting)
  • Get paid weekly, no chasing     (Sevak Celebrator)
  • We bring the customers           (Sevak Searcher)
   ↓
[Phone → OTP → Name]
   ↓
[Category selection grid — pick services you offer]
   ↓
[Service area — map with radius slider]
   ↓
[KYC intro] "Quick verification — 4 steps, 5 mins" + illustration
   ↓
[DigiLocker]    ●○○○
[PAN]            ●●○○
[Bank account]  ●●●○
[Selfie]         ●●●●
   ↓
[Verified] Sevak Verifier + "You're live, Anita!" → dashboard
```

---

## 8. Tone of voice

Brand voice: **warm professional**. Not corporate, not slangy.

| Do                                          | Don't                        |
| ------------------------------------------- | ---------------------------- |
| "We'll be there in 30 min"                  | "ETA: 30:00"                 |
| "Couldn't fetch your bookings — try again?" | "Error 500: failed to fetch" |
| "Looks like you haven't booked yet"         | "No data found"              |
| "Save your spot"                            | "Submit booking"             |
| "Your cleaner Anita"                        | "Service provider #4823"     |

Hindi/English mixed for marketing copy (matches Vikas's audience):

- "Aapke ghar, premium service" (subtitle)
- "Verified pros, zero tension" (banner)
- Empty state: "Abhi koi booking nahi — pehli book karein?"

Numbers always Indian-grouped: ₹1,49,999 not ₹149,999.

---

## 9. What ships when

| Phase        | Deliverable                                                      | Vikas action needed                   |
| ------------ | ---------------------------------------------------------------- | ------------------------------------- |
| **D0 (now)** | This document                                                    | Approve palette + mascot brief        |
| **D1**       | Tailwind tokens updated in both apps, base components rebuilt    | Approve component look                |
| **D2**       | Customer onboarding screens with placeholder mascot              | Generate mascot variants via AI tools |
| **D3**       | Customer home v2 with round expert avatars + rich category tiles | Review live on phone                  |
| ...          |                                                                  |                                       |

### Mascot generation — who does what

- **Vikas:** Run §4.1 + §4.2 prompts through Midjourney/Adobe Firefly/DALL-E.
  Save outputs to `apps/customer/assets/mascot/` as `sevak-<variant>.png`.
- **Claude:** Wire integrations as soon as files appear. Placeholder PNG (plain
  plum circle with "S") used until real mascots arrive — UI doesn't block.

---

## 10. Open questions / future decisions

- **Wordmark refresh?** Existing concepts in `design/wordmark-concepts/` were navy+gold.
  May need a plum+coral redo. Defer to D9 (after core screens done).
- **Light/dark mode** — D9. Currently single (light) mode.
- **Localization** — Hindi screens are out of scope for now; copy is English+Hinglish.
- **Animation library** — Reanimated v4 (already in project) for layout; Lottie
  for mascot motion. Skia for advanced effects deferred to D9+.
