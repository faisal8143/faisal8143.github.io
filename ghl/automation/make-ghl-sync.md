# Make.com scenario: GoHighLevel lead enrichment and routing

**Author:** Faisal Irfan · [github.com/faisal8143](https://github.com/faisal8143)
**Brand:** Northwind Learning (fictional, for demonstration)

The problem this solves: GHL workflows are good at sequencing, and poor at
anything that needs a lookup, a conditional join, or a second system. Running
enrichment inside Make keeps the GHL workflow readable and puts the branching
logic where it can be tested without re-triggering a live contact.

---

## Trigger

**Module:** `Webhooks → Custom webhook` — `nw-ghl-new-lead`

Fired by a GHL workflow action (*Webhook → POST*) on the **Contact Created**
and **Form Submitted** triggers.

```json
{
  "contact_id": "{{contact.id}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "first_name": "{{contact.first_name}}",
  "field_of_study": "{{contact.field_of_study}}",
  "utm_source": "{{contact.utm_source}}",
  "utm_campaign": "{{contact.utm_campaign}}",
  "gclid": "{{contact.gclid}}",
  "form_variant": "{{contact.form_variant}}",
  "stage": "{{contact.stage}}"
}
```

---

## Steps

| # | Module | What it does |
| --- | --- | --- |
| 1 | Webhook | Receives the payload above |
| 2 | Tools → Set variables | Normalises email to lowercase, strips spaces from phone, converts the phone to E.164 using the country from the GHL location |
| 3 | Router | Splits on `stage` — `partial` and `complete` take different paths |
| 4a | HTTP → Make a request | Email verification API; writes `email_valid` and `email_risk` back as custom fields |
| 4b | Google Sheets → Search rows | Course catalogue lookup on `field_of_study`, returning the advisor who owns that field |
| 5 | GoHighLevel → Update contact | Writes `advisor_owner`, `email_valid`, `lead_score` |
| 6 | GoHighLevel → Add tag | `course-{{field_of_study}}` plus `paid` or `organic` from `utm_source` |
| 7 | Filter | Only continues when `email_valid = true` and `stage = complete` |
| 8 | GoHighLevel → Add to workflow | Routes into the matching nurture sequence |
| 9 | Slack → Create a message | Posts high-intent leads (score ≥ 40) into `#admissions` for same-day follow-up |
| 10 | Error handler | On any failure, writes the payload to a Google Sheet and posts to `#integration-errors` so nothing is silently dropped |

---

## Scoring logic (step 5)

Scored inside a Make `Tools → Set variable` rather than in GHL, so the rule
is one expression instead of ten workflow branches:

```
{{
  ( if(1.utm_source = "google"; 20; if(1.utm_source = "meta"; 10; 5)) ) +
  ( if(1.gclid != emptystring; 15; 0) ) +
  ( if(1.field_of_study = "Still deciding"; 0; 15) ) +
  ( if(1.phone != emptystring; 10; 0) )
}}
```

| Score | Band | Routing |
| --- | --- | --- |
| 40+ | Hot | Slack alert, advisor calls same day, 3-step SMS sequence |
| 20–39 | Warm | 5-email nurture, call attempt at day 3 |
| Under 20 | Cold | Monthly newsletter only |

---

## Notes from running this in production

- **Make the webhook idempotent.** GHL retries a failed webhook, and without
  a dedupe on `contact_id` + `stage` you get two Slack pings and a doubled
  score. A data store with a 10-minute TTL key handles it.
- **Never write back into a field the GHL workflow also writes.** Two systems
  owning one field produces a race that only shows up under load.
- **Partials are worth capturing.** Step-1 emails that never finish step 2
  convert at a meaningful rate on a single reminder email, and they only
  exist because the form fires at step 1.
- **Watch the operations count.** The router doubling every branch is the
  usual cause of a plan running out mid-month; filters belong before the
  router, not after it.
