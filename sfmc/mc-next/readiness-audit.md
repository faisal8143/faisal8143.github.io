# Marketing Cloud Next: readiness audit

**Author:** Faisal Irfan · [github.com/faisal8143](https://github.com/faisal8143)
**Last reviewed:** November 2026 · Salesforce Certified Marketing Cloud Next Consultant

What this is: the inventory and the decisions I work through before anyone
commits to a Marketing Cloud Next migration date. The point of an audit is to
find out what has to be rebuilt *before* the budget is set, not after.

A caveat I keep in the document rather than hiding: Marketing Cloud Next is
moving quickly, and some mappings below are not yet settled in Salesforce's
own documentation. Those are marked **verify**. An audit that presents
unsettled things as settled is worse than no audit.

---

## 1. What the platform change actually is

Classic Marketing Cloud is a standalone application with its own data store
(Data Extensions), its own scripting (AMPscript, SSJS), its own query engine
(SQL on data views) and its own orchestration (Journey Builder, Automation
Studio).

Marketing Cloud Next sits on the Salesforce core platform. Data lives in
Data Cloud rather than in Data Extensions, audiences are segments rather than
SQL query activities, and orchestration moves to Flow.

The practical consequence: this is not a version upgrade. Content and logic
are portable in principle, but the data layer underneath them is a different
model, and most of the migration effort lands there.

---

## 2. Concept map

| Classic Marketing Cloud | Marketing Cloud Next | Confidence |
| --- | --- | --- |
| Data Extensions | Data Cloud objects (DLOs/DMOs) assembled into data graphs | Settled |
| Subscriber Key | Unified Individual, produced by identity resolution | Settled |
| Contact Builder attribute groups | Data graphs around the unified profile | Settled |
| `Lookup` / `LookupRows` | Graph navigation with `get` helpers | Settled |
| SQL query activity for an audience | Data Cloud segment on unified data | Settled |
| Journey Builder | Flow Builder | Settled |
| AMPscript | Still runs; compiles to Handlebars underneath | Settled |
| Personalisation syntax in new content | Handlebars helpers | Settled |
| Unsubscribes / preference centre | Communication Subscriptions and Consent objects | Settled |
| Automation Studio (imports, file drops, scripts) | Flow plus data stream ingestion — exact mapping per activity type | **Verify** |
| SSJS and CloudPages | No documented equivalent found | **Verify** |
| Content Builder templates | Migration path not documented in sources reviewed | **Verify** |

---

## 3. Personalisation, side by side

The same fallback, written both ways.

**AMPscript**

```
SET @firstName = AttributeValue("FirstName")
IF Empty(@firstName) THEN
  SET @firstName = "there"
ELSE
  SET @firstName = ProperCase(Trim(@firstName))
ENDIF
```

**Marketing Cloud Next (Handlebars)**

```
{{fallback (get (get @root "$dataGraph") "ssot__FirstName__c") "there"}}
```

What this tells you about the migration:

- The **logic** transfers. Conditions, fallbacks and data relationships are
  the same problems, expressed differently.
- The **data access** does not. `Lookup("DE", "Field", "Key", @value)` assumes
  a table you query. `get` walks a graph already assembled around the person.
  A template full of lookups is not a find-and-replace job; the data has to
  exist on the graph first.
- Complexity moves **upstream**. Work AMPscript used to do at send time —
  joining, deduplicating, picking the latest row — belongs in the data model
  and the segment before the send.

---

## 4. The inventory I take

### Content and code
- [ ] Every template, with a count of AMPscript blocks per template
- [ ] Every `Lookup`, `LookupRows`, `LookupOrderedRows` call, with the DE it reads
- [ ] SSJS blocks, what each one does, and whether it runs in an email or a CloudPage
- [ ] CloudPages, with their purpose: form handler, preference centre, landing page
- [ ] Content Builder blocks shared across templates

### Data
- [ ] Every Data Extension: row count, update frequency, who writes to it
- [ ] Which DEs are sendable, and which are derived from others
- [ ] Attribute groups and relationship cardinality
- [ ] Data retention settings, which are easy to lose in a migration
- [ ] Consent and preference data, and where a global unsubscribe is recorded

### Automation and orchestration
- [ ] Every automation: trigger, schedule, activities in order
- [ ] SQL query activities, with the data views each one reads
- [ ] File drops and imports, including the SFTP paths and file formats
- [ ] Every journey: entry source, splits, goals, exit criteria, re-entry rules

### Integrations
- [ ] API integrations in and out, with auth method and call volume
- [ ] Marketing Cloud Connect, and what it syncs
- [ ] Anything reading the tracking data views for reporting

---

## 5. Decisions to make before any build starts

These are the ones that are expensive to reverse:

| Decision | Why it is hard to undo |
| --- | --- |
| Org strategy | Which Salesforce org Marketing Cloud Next runs in shapes everything downstream |
| Real-time vs batch per source | A data stream's refresh mode cannot be changed after creation |
| Identity resolution rules | These decide who counts as the same person; changing them later re-resolves the whole profile base |
| Consent model | Must be mapped before any contact is imported, not after |
| Channel and credit model | Email, SMS and WhatsApp are tracked and billed differently |
| Environment plan | Where testing happens, and how changes get promoted |

---

## 6. What the output looks like

A readiness audit should end with three things, not an opinion:

1. **An inventory** — every asset, categorised as portable, rebuild, or retire.
2. **A risk register** — what breaks if it is migrated as-is, ranked.
3. **A phased roadmap** — what moves first, what runs in parallel, and for how
   long both platforms have to coexist.

The honest finding on most audits is that a chunk of the estate should be
retired rather than migrated. Templates nobody sends, automations that failed
silently for a year, DEs with no writer. Migrating those costs real money and
buys nothing.

---

## Sources

Platform details above were checked against public documentation and
practitioner writing in November 2026. Marketing Cloud Next is changing
release to release, so verify anything marked **verify** against the current
Salesforce documentation before relying on it in a client engagement.
