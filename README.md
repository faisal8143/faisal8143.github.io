# Faisal Irfan | Email & Marketing Cloud Developer Portfolio

Senior **Salesforce Marketing Cloud (SFMC)** and **Pardot (Account Engagement)** developer with 8+ years building personalised, responsive emails and automated journeys for enterprise brands in Australia, the UAE and Europe.

**Live portfolio:** https://faisal8143.github.io/email-dev-portfolio/
**LinkedIn:** https://www.linkedin.com/in/faisalirfan-sfmc
**Location:** Karachi, Pakistan. Open to remote work and relocation.

---

## Email builds

| Template | Platform | Highlights | Preview |
|---|---|---|---|
| [`pardot-master-template.html`](emails/pardot-master-template.html) | Pardot | 11-block drag-and-drop library, `pardot-repeatable` / `pardot-region`, dark mode, VML buttons | [View](https://faisal8143.github.io/email-dev-portfolio/emails/previews/pardot-master.html) |
| [`webinar-edm-dark.html`](emails/webinar-edm-dark.html) | Pardot | Dark-by-design campaign, two-session layout that restacks on mobile, images-off safe CTAs | [View](https://faisal8143.github.io/email-dev-portfolio/emails/previews/webinar-dark.html) |
| [`responsive-master-template.html`](emails/responsive-master-template.html) | SFMC | AMPscript personalisation, hybrid layout, alias-tracked links, system-string footer | [View](https://faisal8143.github.io/email-dev-portfolio/emails/previews/sfmc-master.html) |

Every template is tested for Outlook desktop and 365, Gmail web and app, Apple Mail and iOS, dark mode, and mobile widths from 320px.

## Case studies

| Program | Platform | What it shows |
|---|---|---|
| [Enrolment nurture journey](sfmc/journeys/enrolment-nurture-journey.md) | SFMC | Architecture, data model, Journey Builder splits, exit criteria, Sales Cloud hand-off |
| [B2B nurture + scoring & grading](pardot/programs/engagement-studio-nurture.md) | Pardot | Engagement Studio flow, scoring and grading tables, automation rules, MQL definition |

## Marketing Cloud & Pardot code

| File | What it shows |
|---|---|
| [`sfmc/ampscript/personalization.amp`](sfmc/ampscript/personalization.amp) | Ordered DE lookups, safe fallbacks, localised dates, UTM-tagged CTAs, conditional content |
| [`sfmc/ssjs/cloudpage-form-handler.ssjs`](sfmc/ssjs/cloudpage-form-handler.ssjs) | CloudPage POST handler: validation, honeypot spam trap, DE upsert, error logging, JSON response |
| [`sfmc/cloudpages/preference-center.html`](sfmc/cloudpages/preference-center.html) | CloudPage preference centre: UpsertData, LogUnsubEvent global unsubscribe, accessible form |
| [`sfmc/ssjs/wsproxy-triggered-send.ssjs`](sfmc/ssjs/wsproxy-triggered-send.ssjs) | WSProxy triggered send with retry and logging |
| [`sfmc/sql/dedupe-latest-enquiry.sql`](sfmc/sql/dedupe-latest-enquiry.sql) | ROW_NUMBER dedupe keeping the latest enquiry per person |
| [`sfmc/sql/engaged-subscribers-90d.sql`](sfmc/sql/engaged-subscribers-90d.sql) | Automation Studio engagement scoring on `_Open`, `_Click`, `_Bounce` and `_Subscribers` |
| [`pardot/form-styles.css`](pardot/form-styles.css) | Accessible, responsive styles for Pardot's default form markup |
| [`pardot/landing-pages/layout-template.html`](pardot/landing-pages/layout-template.html) | Pardot layout template with editable regions and branded form card |
| [`pardot/form-handler-integration.js`](pardot/form-handler-integration.js) | Custom form to Pardot form handler with attribution capture and validation |

## Repository structure

```
email-dev-portfolio/
├── index.html                  Portfolio site (GitHub Pages)
├── assets/img/                 Brand images used by the emails
├── emails/
│   ├── pardot-master-template.html
│   ├── webinar-edm-dark.html
│   ├── responsive-master-template.html
│   └── previews/               Same emails with sample data filled in
├── sfmc/
│   ├── ampscript/
│   ├── ssjs/
│   └── sql/
└── pardot/
```

## Skills

**Salesforce Marketing Cloud:** Journey Builder · Automation Studio · Email Studio · Content Builder · CloudPages · Contact Builder · AMPscript · SSJS · SQL · Data Extensions · Marketing Cloud Next

**Pardot / Account Engagement:** Email and landing page templates · Forms and form handlers · Engagement Studio · Lists and segmentation · Scoring and grading

**Email development:** Hand-coded HTML/CSS emails · Hybrid responsive layouts · Outlook/MSO fixes · Dark mode · Accessibility · Rendering QA

**Certifications:** 8× Salesforce Certified, including Marketing Cloud Next

## Experience

- **Monks** (formerly Media.Monks), Marketing Cloud Developer: SFMC and Pardot builds for Australian enterprise clients in higher education, healthcare, manufacturing, software and non-profit.
- **Destined** (2019–2022): agency email and marketing automation development.

## A note on the samples

All templates use **Northwind Learning**, a fictional brand. Client work is under NDA, so these builds show the same patterns and standards I ship in production without any client code, copy or assets.

## Contact

Open to full-time roles and freelance SFMC / Pardot / email development projects. Reach me on [LinkedIn](https://www.linkedin.com/in/faisalirfan-sfmc).
