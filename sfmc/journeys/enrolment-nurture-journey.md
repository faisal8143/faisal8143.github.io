# Enrolment Nurture Journey (Journey Builder)

**Goal:** turn a course enquiry into an application within 30 days.
**Built in:** Salesforce Marketing Cloud, Journey Builder + Automation Studio.
**Brand:** Northwind Learning (fictional). Author: Faisal Irfan.

---

## Architecture

```
Web form ──► CloudPage (SSJS handler) ──► Course_Enquiries_Raw (DE)
                                              │
                         Automation Studio (every 15 min)
                         1. SQL dedupe  ──► Course_Enquiries (sendable DE)
                         2. SQL scoring ──► Engagement_Score_90d
                                              │
                               Journey Builder entry event (DE)
                                              ▼
 Day 0   Welcome email (AMPscript personalised by course)
 Wait 2 days
 Split:  Engagement split ── opened/clicked? ──┐
          │ yes                                 │ no
          ▼                                     ▼
 Day 2   Course deep-dive email        Day 2   Re-send with new subject line
 Wait 3 days                            Wait 3 days
 Split:  Decision split on Engagement_Score_90d.Segment
          Hot  ──► Advisor call task (Sales Cloud via MC Connect) + SMS
          Warm ──► Webinar invite email
          Cold ──► Scholarship / fees email
 Wait until 7 days before intake close
 Day ~25 Deadline reminder (dynamic countdown from Term_Config)
 Exit criteria: Application_Submitted = true (checked at every step)
 Goal:  Application_Submitted = true within 30 days
```

## Data model

| Data Extension | Key | Purpose |
|---|---|---|
| `Course_Enquiries_Raw` | none (append) | Every form fill, untouched |
| `Course_Enquiries` | SubscriberKey | Latest enquiry per person, journey entry source |
| `Term_Config` | TermName | Intake names and close dates used for countdowns |
| `Engagement_Score_90d` | SubscriberKey | Hot / Warm / Cold segment for decision splits |
| `Subscriber_Preferences` | SubscriberKey | Topics and frequency from the preference centre |

## Design decisions

- **Dedupe before entry.** The SQL step keeps only the latest enquiry, so a person who submits twice never enters the journey twice.
- **Exit criteria on every step.** Anyone who applies leaves immediately, so no one gets a "don't miss out" email after applying.
- **Engagement split before content split.** Non-openers get a subject-line re-send before the journey invests in deeper content.
- **Sales hand-off only for Hot leads.** Advisors get tasks for people most likely to convert, not the whole list.
- **Preference centre respected.** Every email checks `Subscriber_Preferences.Frequency` with AMPscript and suppresses if the person chose monthly.

## Measurement

Open, click and conversion tracked per step. Goal conversion and the Hot/Warm/Cold mix are reviewed weekly to tune scoring thresholds.

Related code: [`dedupe-latest-enquiry.sql`](../sql/dedupe-latest-enquiry.sql) · [`engaged-subscribers-90d.sql`](../sql/engaged-subscribers-90d.sql) · [`personalization.amp`](../ampscript/personalization.amp) · [`cloudpage-form-handler.ssjs`](../ssjs/cloudpage-form-handler.ssjs) · [`preference-center.html`](../cloudpages/preference-center.html)
