---
name: Red Acompaña
description: Una ficha de derivación que se llena en vivo, de la copia de la persona a la copia del especialista.
colors:
  tinta: "#1B3768"
  pasta: "#2142A8"
  timbre: "#5B3A99"
  amarilla: "#FAE89A"
  amarilla-2: "#D9BF55"
  rosa: "#F7CAD6"
  rosa-2: "#DC97AB"
  folio: "#AD1F2B"
  folio-2: "#FBE9EA"
  media: "#8A5A00"
  media-2: "#FBF1DC"
  baja: "#2E6B4F"
  baja-2: "#E5F2EB"
  mesa: "#E7EBF2"
  papel: "#FFFFFF"
  nube: "#EEF2F8"
  texto: "#18202E"
  suave: "#4D5A70"
  suave-a: "#594813"
  suave-r: "#66303F"
  regla: "#B7C3D8"
  regla-2: "#DCE2ED"
  regla-c: "rgba(27,55,104,.3)"
  caja: "rgba(27,55,104,.5)"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 2.1vw, 1.95rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 800
    lineHeight: 1.2
    fontVariation: "'wdth' 110"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 800
    lineHeight: 1.15
    fontVariation: "'wdth' 110"
  body:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.3
    fontVariation: "'wdth' 90"
  stamp:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "0.03em"
rounded:
  field: "2px"
  control: "3px"
  sheet: "4px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-primary-hover:
    backgroundColor: "{colors.pasta}"
  button-ghost:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-ghost-hover:
    textColor: "{colors.pasta}"
  input-compose:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.texto}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
  chip-quick-reply:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  tag-flag:
    backgroundColor: "{colors.media-2}"
    textColor: "{colors.media}"
    rounded: "{rounded.field}"
    padding: "2px 7px"
  tag-flag-urgent:
    backgroundColor: "{colors.folio-2}"
    textColor: "{colors.folio}"
    rounded: "{rounded.field}"
    padding: "2px 7px"
  copy-person:
    backgroundColor: "{colors.amarilla}"
    textColor: "{colors.texto}"
    rounded: "{rounded.sheet}"
  copy-specialist:
    backgroundColor: "{colors.rosa}"
    textColor: "{colors.texto}"
    rounded: "{rounded.sheet}"
  copy-original:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.texto}"
    rounded: "{rounded.sheet}"
  message-person:
    backgroundColor: "{colors.pasta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.sheet}"
    padding: "8px 12px"
  message-bot:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.texto}"
    rounded: "{rounded.sheet}"
    padding: "8px 12px"
  stamp:
    textColor: "{colors.timbre}"
    typography: "{typography.stamp}"
    rounded: "{rounded.sheet}"
    padding: "7px 12px 8px"
  form-band:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    padding: "12px 16px 0"
  tab-active:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.control}"
---

# Design System: Red Acompaña

## Overview

**Creative North Star: "La ficha de derivación"**

Every screen is a carbonless referral form from a Chilean public-health clinic, filled in while the audience watches. The page is a desk. On it sit three sheets of one form set: the person's copy in canary, the specialist's copy in pink, and the white original where the engine's tests are recorded. All three carry the same red folio. A navy band heads the page the way a printed header heads an interconsulta: it holds the form's title, the instruction and the header fields. What the person writes is filled in ballpoint blue. What the specialist does is marked in violet: the tick in "Disponible", the X in the chosen referral, and the stamp pressed into the "Firma y timbre" box.

The world is clinical and administrative on purpose. It borrows the authority of paperwork people already trust (folio numbers, printed field captions, ruled boxes, checkbox priorities, carbon copies) instead of the language of chat apps or startup dashboards. Content is printed directly on each copy between rules, never set in white cards nested inside it. The density is that of a form: small labeled fields, hairline rules, tabular numbers, no decoration that is not also information. Everything is sized to be read on a projector in a lit meeting room, and at 1366 by 768 both copies, the compose field, the referral actions and the stamp's landing box all fit on one screen.

The page is light-only on purpose: it is paper in a lit room. Depth comes from paper color and printed rules, never from lifting surfaces.

**Key Characteristics:**
- One form set: canary copy for the person, pink copy for the specialist, white original for the lab, all three under the same red folio.
- Printed-form furniture: navy header band with title and header fields, navy rules under headers, ruled field boxes, condensed captions, checkbox priorities with a drawn X.
- Two inks with owners: ballpoint blue for the person's words, violet for the specialist's actions.
- A blank form at rest that fills itself in live; one ceremony when the violet stamp lands in its box.
- Projector scale: fluid root size, no text under 0.78rem, the whole exchange inside one screen.

## Colors

A cool office palette of navy print on white and carbonless-copy paper, with two inks that each belong to someone and one red reserved for danger.

### Primary
- **Form Navy** (tinta): the printed form itself. The header band, headings, field captions, the 1.5px rules under headers, primary buttons, the active tab.

### Secondary
- **Ballpoint Blue** (pasta): the person's pen. The person's messages, every filled-in field value in the ficha, "Lo que escribió", the person's entries in the attendance register, the caret, the focus ring and the hover state of navy controls.

### Tertiary
- **Stamp Violet** (timbre): the specialist's ink. The stamp, the tick in "Disponible", the X in the chosen referral, the specialist's messages and register entries.

### Paper
- **Canary Copy** (amarilla), edged in **Canary Edge** (amarilla-2): the person's copy.
- **Pink Copy** (rosa), edged in **Pink Edge** (rosa-2): the specialist's copy.
- **Original White** (papel): the lab's original sheet, inputs, chat slips and the crisis notice.
- **Office Desk** (mesa): the page background the sheets rest on.

### Signal
- **Folio Red** (folio, tint folio-2): the folio number, high risk, the urgent mark, a late timer, the crisis helplines.
- **Ochre** (media, tint media-2): medium risk and risk-signal tags.
- **Ledger Green** (baja, tint baja-2): low risk, specialist availability, passed tests.

### Neutral
- **Ink Black** (texto): body text.
- **Slate** (suave): secondary text on white and the desk.
- **Canary Slate** (suave-a) and **Pink Slate** (suave-r): secondary text on each copy, keeping 4.5:1 on its paper.
- **Printed Rule** (regla) and **Faint Rule** (regla-2): rules on white paper.
- **Copy Rule** (regla-c): navy at 30% for rules printed on the colored copies, so one rule works on canary and on pink.
- **Box Outline** (caja): navy at 50% for printed checkboxes and input borders on the copies.
- **Cloud** (nube): the bot's lines in the lab's test conversations.

### Named Rules
**The Carbon Copy Rule.** A paper color says whose copy it is: canary is the person's, pink is the specialist's, white is the original. Canary and pink are never decoration; they appear elsewhere only as the legend that points at a copy, as in the band's instruction.

**The Two Inks Rule.** Ballpoint blue is the person's pen: the person's words, everything filled in from them, and wherever a hand is on the form (caret, focus ring, hover). Stamp violet is only ever the specialist's actions. Navy is the printed form. Inks are never swapped.

**The Red Folio Rule.** Folio red is reserved for the folio number, high risk, urgency and the crisis helplines. Its rarity is how the back row spots danger.

## Typography

**Display Font:** Archivo, variable width and weight (with Helvetica Neue, Arial)
**Body Font:** Atkinson Hyperlegible Next (with Atkinson Hyperlegible, Segoe UI, system-ui)

**Character:** Archivo's width axis plays both parts of a printed form: wide and heavy for titles and the stamp, condensed for field captions. Atkinson Hyperlegible Next, designed for low-vision readers, carries every sentence a person in crisis or a projector audience has to read; its slashed zero keeps numbers unambiguous.

### Hierarchy
- **Display** (800, clamp(1.5rem, 2.1vw, 1.95rem), 1.1, width 112%): the form title in the navy band, white.
- **Headline** (800, 1.45rem, width 110%): the title of the original sheet (lab).
- **Title** (800, 1.15rem, 1.15, width 110%): the ficha title. Copy titles run 800 at 1.08rem, width 106%; section titles 800 at 0.98rem.
- **Body** (400, 1rem, 1.5): all reading text; chat messages at 1.02rem/1.45; filled values at 0.95rem in ballpoint.
- **Label** (600, 0.78 to 0.8rem, 1.3, width 88 to 92%): printed field captions (field names, header fields, table headers, status boxes, the copy marker), sentence case, in navy or the paper's slate.
- **Stamp** (800, 1.4rem, 1.02, 0.03em tracking, uppercase): the stamp's decision only.
- **Figures**: folio, timers, stats, times and score use tabular numbers.

### Named Rules
**The Printed Caption Rule.** Field names are condensed Archivo 600 in sentence case, like the captions printed on a form. Uppercase belongs to the stamp alone.

**The Back Row Rule.** The root size scales with the screen, clamp(16px, 0.55vw + 10px, 18px), and no text drops below 0.78rem.

## Layout

The page is a desk with a full-bleed navy form band at the top. The band's first row holds the brand, the form title with the instruction under it, and the boxed demo notice; its second row is the form's header fields (Motor, Costo de operación, Derivación, Pruebas) in four ruled cells. Below the band sits a centered container of at most 1320px.

From 1100px wide, the two copies sit side by side about 150px from the top: the person's copy at 380 to 470px and the specialist's copy taking the rest. Both are as tall as the screen allows, sized to the viewport minus the measured top of the copies (clamp(540px, 100dvh minus top minus 14px, 900px)), so a projector shows the whole exchange at once. Inside the specialist's copy, a ruled line of example stats runs across the top; below it a 1.6fr / 1fr grid puts the ficha on the left and, divided by a vertical rule, the specialist roster (or the attendance register once a case is taken) on the right. The white original (lab) spans the full width below.

Under 1100px the copies stack behind a tab strip (Persona, Especialista, Pruebas) with a red count badge for new cases, the header fields fold to two by two, and the specialist's copy grows with its content. Under 560px the ficha's fields and its closing row stack, and inner padding drops to 12px.

Spacing follows 6, 8, 12, 16 and 24px. Inner copy padding is 16px; fields are padded 5 to 7px by 10px.

## Elevation & Depth

Flat paper on a desk. Sheets are separated by paper color and a 1px border in the paper's edge color, never by lifting. The only shadow is a hairline drop directly under each sheet, the way paper casts a sliver of shadow on a desk. The stamp uses a multiply blend so it reads as ink pressed into the paper.

### Shadow Vocabulary
- **Sheet hairline** (`box-shadow: 0 1px 0 rgba(27,55,104,.12)`): under each copy and the original.

### Named Rules
**The Paper-On-Desk Rule.** No blurred shadows, gradients, glass or glow. A surface earns attention with its paper color, its border and its rules.

**The Printed-On Rule.** Content is printed on the copy between rules: fields, stats, rosters, registers. A white box inside a copy is reserved for what is physically a separate slip (a chat message, the crisis notice, an input).

## Shapes

Paper corners, barely rounded: 4px on sheets and chat slips, 3px on buttons, inputs and quick replies, 2px on ruled field boxes, tags and printed checkboxes. A chat slip cuts its corner toward the speaker to 1px. There are no pills and no round avatars; circles appear only as the typing dots and the breathing ring.

Rules carry the form's structure: a 1.5px navy rule under every header (copy headers, ficha title, section titles, lab title, table headers), 1px copy rules between fields and register lines. Under a high-risk ficha that is still waiting, the title rule turns folio red. Status, priority, availability and referral choice all use printed squares: the selected priority gets a drawn X in its risk color, the chosen referral a violet X, checked availability a violet tick, finished steps a ballpoint tick. The stamp is the one rotated shape: a 3px double violet border tilted -7 degrees.

## Components

### Buttons
Printed-form buttons: solid, square-shouldered, left-aligned text.
- **Shape:** control corner (3px).
- **Primary:** navy fill, white Archivo 700 at 0.88rem and width 96%, 10px by 13px padding (9px by 12px inside the ficha).
- **Hover / Focus:** fill turns ballpoint blue; focus is a 2px ballpoint outline offset 2px.
- **Ghost:** white with navy text and a navy border; hover turns text and border ballpoint blue.
- **Plain:** transparent with a box-outline border.
- **Disabled:** 40% opacity, no hover change.

### Chips
- **Quick replies (person):** white boxes with a box-outline border, 3px corners, navy body text; hover turns ballpoint blue.
- **Quick replies (specialist):** a ruled list of options printed on the copy, each a full-width line with a copy rule under it.
- **Risk tags:** field-corner tags in Archivo 600 at 0.8rem; a signal is ochre on its tint, an urgent signal folio red on its tint.
- **Urgent mark:** white on folio red, Archivo 800, slightly wide and tracked.

### Cards / Containers
- **Copies:** sheet corner (4px), filled with their paper, 1px border in the paper's edge, hairline shadow. Each opens with a one-line header (title, status, controls) over a 1.5px navy rule and closes with a right-aligned printed copy marker ("Copia amarilla para la persona", "Copia rosa para el especialista", "Original para el laboratorio de pruebas") over a copy rule.
- **Stats line:** example figures printed as one ruled line of caption and value pairs, tagged "Datos de ejemplo" in a small outlined box.

### Inputs / Fields
- **Style:** white, 1px box-outline border, 3px corners, 11px by 14px padding, Atkinson Hyperlegible Next at 1rem; ballpoint caret.
- **Focus:** 2px ballpoint blue outline, offset 2px.
- **Send:** a 44px navy square with a white arrow; hover turns ballpoint blue.

### Navigation
- **Tabs (under 1100px):** a white strip with 3px padding; tabs in Archivo 700 at 0.9rem; the active tab is navy with white text; a red square badge counts new cases.

### Casillas
Printed checkboxes, 15 to 18px, 2px corners, box-outline border. Ticked by whoever acted: violet for the specialist's availability, green in the roster, ballpoint in the person's case steps. The real input stays focusable and draws the focus ring on the box.

### Ficha de derivación (signature)
The form the demo is about, printed straight onto the pink copy and present from the first second as a blank form. Its title sits over a 1.5px navy rule with the red folio ("N.º 004127") at the right and, while a case waits, the elapsed time under it. Then a priority row of printed squares (Baja, Media, Alta) with an X in the matching one and an urgent mark. A ruled grid follows: ¿Lugar seguro?, Edad and Temas across the top, then full-width rows for Señales (tags) and Lo que escribió (on two ruled lines: the message that raised the risk, then the latest one, each clamped to two lines). The closing row splits into Derivación on the left (empty printed options at rest, action buttons while a case waits, the chosen option crossed in violet once taken) and the Firma y timbre box on the right, a blank space over a signature line and its caption. At high risk the schedule option is withdrawn and a red note says why.

### Timbre (signature)
When the specialist acts, the stamp lands inside the Firma y timbre box, never over the person's words: a violet 3px double border, rotated -7 degrees, multiply blend, the decision in uppercase Archivo 800 at 1.4rem, then the specialist's name and the date and time in tabular numbers. It lands with a 0.42s press (from 1.6x scale and a 2px blur to rest) only when the viewer has not asked for reduced motion, and only once per decision.

### Registro de atención
Once a case is taken, the right column becomes a ruled register: time in tabular numbers, speaker, text. Person entries are in ballpoint, specialist entries in violet, and an urgent entry carries the red urgent mark.

### Conversation
On the canary copy, the bot's messages are white slips with a canary-edge border on the left; the person's are ballpoint blue with white text on the right; the specialist's are white slips with a 1.5px violet border. System notes are centered captions between copy rules, in folio red when they are alerts. Typing dots pulse in slate; the breathing exercise is a ballpoint ring that grows over 4s and shrinks over 6s.

## Do's and Don'ts

### Do:
- **Do** give each sheet the paper of its owner: canary (#FAE89A) for the person, pink (#F7CAD6) for the specialist, white for the original, and print the same folio on all of them.
- **Do** print content directly on the copy between copy rules; keep white boxes for real slips (messages, the crisis notice, inputs).
- **Do** keep folio red (#AD1F2B) for the folio number, high risk, urgency and the crisis helplines.
- **Do** set field names as printed captions: Archivo 600, 0.78 to 0.8rem, condensed, sentence case.
- **Do** fill values in ballpoint blue and mark the specialist's acts in violet: the tick, the X and the stamp in its box.
- **Do** use the paper's own slate for secondary text (#594813 on canary, #66303F on pink) so it holds 4.5:1.
- **Do** keep the "Demo con datos de ejemplo" notice in the band and tag example figures "Datos de ejemplo".
- **Do** use tabular numbers for folio, timers, stats, times and scores.

### Don't:
- **Don't** lift surfaces with blurred shadows, gradients, glass or glow; the only shadow is the 1px hairline under a sheet.
- **Don't** nest white cards inside a copy, and don't use pills, round avatars or corners above 4px.
- **Don't** use canary or pink as decoration outside their copies and the legend that names them.
- **Don't** use stamp violet for anything the specialist did not do, or ballpoint blue for anything other than the person's words and the pen's touch (caret, focus, hover).
- **Don't** let the stamp cover the person's words; it lands in the Firma y timbre box.
- **Don't** set uppercase anywhere except the stamp, or text below 0.78rem.
