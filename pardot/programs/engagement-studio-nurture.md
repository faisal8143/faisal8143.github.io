# B2B Nurture Program + Scoring & Grading Model (Pardot / Account Engagement)

**Goal:** move marketing-qualified prospects to sales-ready in 45 days.
**Built in:** Pardot Engagement Studio, Automation Rules, Scoring & Grading, Salesforce sync.
**Brand:** Northwind Learning corporate training (fictional). Author: Faisal Irfan.

---

## Engagement Studio flow

```
Start: List "Guide download - corporate" (dynamic list)
  │
  ├─ Send: Guide follow-up email
  ├─ Wait 3 days
  ├─ Rule: Prospect score ≥ 50?
  │     yes ─► Action: Assign to Salesforce queue "Corporate Sales" + notify owner ─► END
  │     no
  ├─ Trigger: Opened guide follow-up? (wait up to 4 days)
  │     yes ─► Send: Case study email ─► Wait 5 days
  │     no  ─► Send: Short "3 tips" email (new subject) ─► Wait 5 days
  ├─ Trigger: Visited pricing page? (wait up to 7 days)
  │     yes ─► Action: Adjust score +15, add tag "pricing-intent"
  │            Send: "Book a 15-min call" email (calendar link)
  │     no  ─► Send: Webinar invite email
  ├─ Wait 7 days
  ├─ Rule: Grade ≥ B AND score ≥ 50?
  │     yes ─► Action: Change prospect stage to MQL, create Salesforce task
  │     no  ─► Action: Add to "Long-term monthly newsletter" list
  └─ END
```

## Scoring model (behaviour, how interested)

| Activity | Points |
|---|---|
| Email open | +1 |
| Email click | +3 |
| Form submission (any) | +25 |
| Pricing page view | +15 |
| Webinar registration | +20 |
| Webinar attended | +30 |
| Unsubscribe / hard bounce | −100 |
| No activity in 30 days (decay rule) | −10 |

**MQL threshold:** score ≥ 50 **and** grade ≥ B.

## Grading model (profile, how good a fit)

| Criteria | Adjustment |
|---|---|
| Job title contains L&D, HR, People, Training | +1 full grade |
| Company size 200+ employees | +1 full grade |
| Industry: Healthcare, Finance, Government | +1/3 grade |
| Free email domain (gmail, yahoo) | −1 full grade |
| Country outside service regions | −2 full grades |

## Supporting automation rules

- **Score decay:** prospects with no activity in 30 days lose 10 points (repeats monthly).
- **Recycle:** Salesforce opportunity "Closed Lost" → reset score to 0, add back to nurture.
- **Data hygiene:** prospects with missing country after 2 form fills → progressive profiling field turns on.

## Why it works

- **Score and grade together** stop high-activity students and competitors from reaching sales.
- **Pricing-page intent** is the strongest buying signal, so it changes both the score and the next email.
- **Every branch ends somewhere useful**, either sales or long-term nurture, so no prospect is dropped.

Related code: [`landing-pages/layout-template.html`](../landing-pages/layout-template.html) · [`form-styles.css`](../form-styles.css) · [`form-handler-integration.js`](../form-handler-integration.js) · [`emails/pardot-master-template.html`](../../emails/pardot-master-template.html)
