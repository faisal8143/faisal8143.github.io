# AMPscript patterns I ship

**Author:** Faisal Irfan · [github.com/faisal8143](https://github.com/faisal8143)
**Brand:** Northwind Learning (fictional, for demonstration)

Production patterns, written out with the reasoning. Every one of these exists
because something went wrong in a real send once.

---

## 1. No lookup without a fallback

The single most common cause of an embarrassing send is a blank personalisation
value. Every `Lookup` gets a default, and the default is written to read as a
complete sentence.

```
SET @firstName = AttributeValue("FirstName")
IF Empty(@firstName) THEN
  SET @firstName = "there"
ELSE
  SET @firstName = ProperCase(Trim(@firstName))
ENDIF
```

`Trim` before `ProperCase`, not after: a leading space makes `ProperCase`
capitalise the space and leave the first letter lowercase.

---

## 2. Most recent row, not just any row

`LookupRows` returns rows in no guaranteed order. If you want the latest
enquiry, say so.

```
SET @rows = LookupOrderedRows("Course_Enquiries", 1, "EnquiryDate DESC",
                              "SubscriberKey", _subscriberkey)
IF RowCount(@rows) > 0 THEN
  SET @row  = Row(@rows, 1)
  SET @name = Field(@row, "CourseName")
ELSE
  SET @name = "your chosen course"
ENDIF
```

Always guard with `RowCount` before `Row`. Calling `Row` on an empty set
throws and kills the whole send, not just that subscriber's content block.

---

## 3. Dates: format at the edge, compute in the middle

Store and compare raw dates. Format only at the point of output, and give the
locale explicitly so an Australian send does not render US dates.

```
SET @closeRaw  = Lookup("Term_Config", "CloseDate", "IsCurrent", "true")
SET @daysLeft  = DateDiff(Now(), @closeRaw, "D")
SET @closeDate = FormatDate(@closeRaw, "d MMMM yyyy", "", "en-AU")
```

`DateDiff(Now(), …)` counts from the current timestamp, so a deadline stored
at midnight reads one day short. Store deadlines at end of day.

---

## 4. Tiered urgency instead of one static line

```
IF @daysLeft <= 7 THEN
  SET @urgency = "closing"
  SET @banner  = Concat("Applications close in ", @daysLeft, " days")
ELSEIF @daysLeft <= 30 THEN
  SET @urgency = "soon"
  SET @banner  = Concat("Applications close on ", @closeDate)
ELSE
  SET @urgency = "open"
  SET @banner  = Concat("Enrolments are open for ", @termName)
ENDIF
```

The tier name also becomes a CSS class on the banner, so the colour and the
copy can never disagree with each other.

---

## 5. Conditional HTML, not conditional variables

Gate the markup itself. An `IF` opened in one block closes in a later one, and
everything between them is what gets conditionally rendered.

```
%%[ IF @isReturning == "true" THEN ]%%
  <div class="welcome-back">Your credits carry over automatically.</div>
%%[ ELSE ]%%
  <p>New to Northwind? Here is how your first term works.</p>
%%[ ENDIF ]%%
```

Building two strings in variables and outputting one works, but it puts HTML
inside AMPscript where no one will find it to edit later.

---

## 6. Loop a row set for line items

```
SET @items = LookupRows("Cart_Items", "SubscriberKey", _subscriberkey)
SET @count = RowCount(@items)

IF @count > 0 THEN
  FOR @i = 1 TO @count DO
    SET @item = Row(@items, @i)
%%[ ]%%
    <tr>
      <td>%%=v(Field(@item, "ProductName"))=%%</td>
      <td align="right">%%=FormatNumber(Field(@item, "Price"), "C")=%%</td>
    </tr>
%%[
  NEXT @i
ENDIF
]%%
```

Cap the loop. A data error that returns 40,000 rows will otherwise time the
send out rather than fail loudly.

---

## 7. Tracked links, built once

```
SET @ctaUrl = Concat("https://example.edu/apply",
                     "?course=", URLEncode(@courseCode, 1, 1),
                     "&utm_source=sfmc&utm_medium=email",
                     "&utm_campaign=", URLEncode(emailname_, 1, 1))
```

Then in the HTML: `href="%%=RedirectTo(@ctaUrl)=%%"` with an `alias` attribute
so the click report reads as link names, not a list of identical URLs.

`URLEncode(value, 1, 1)` — the second argument encodes reserved characters, the
third encodes the `%` sign itself. Miss them and a course code with a space
silently breaks the landing page.

---

## 8. Treat booleans as strings

Data Extension boolean fields come back as the strings `"True"`/`"False"`, and
the casing varies by how the row was written.

```
SET @isReturning = Lowercase(Lookup("Student_Status", "IsReturning",
                                    "SubscriberKey", _subscriberkey))
IF @isReturning == "true" THEN
```

Comparing against the unquoted `true` keyword works sometimes and fails
silently the rest of the time. Lowercase it and compare against a string.

---

## 9. Fail soft, log hard

In a CloudPage, wrap anything that touches data so a visitor never sees a stack
trace, and write the error somewhere you will actually look.

```
%%[
SET @ok = true
SET @email = RequestParameter("email")
IF Empty(@email) OR IndexOf(@email, "@") == 0 THEN
  SET @ok = false
  SET @msg = "Please enter a valid email address."
ENDIF

IF @ok == true THEN
  UpsertData("Subscriber_Preferences", 1, "SubscriberKey", @email,
             "UpdatedAt", Now())
ENDIF
]%%
```

---

## 10. Make the send self-documenting

A one-line comment block at the top of every template, naming the Data
Extensions it reads and who wrote it, saves the next developer twenty minutes.
The footer of a test send carrying `segment`, `score` and the key variable
values turns QA from guesswork into reading.

```
<span style="color:#94A3B8">
  Segment: %%=v(@segment)=%% · score %%=v(@score)=%% · days to close %%=v(@daysLeft)=%%
</span>
```

Strip it with an `IF` on a `IsTest` attribute rather than by hand, because by
hand means it ships to production once.

---

## What I check before any send goes out

| Check | Why |
| --- | --- |
| Every `Lookup` has a fallback | Blank personalisation is the most visible failure |
| `RowCount` guards every `Row` | An empty set throws and kills the send |
| Dates formatted with an explicit locale | Prevents US dates in an AU send |
| Booleans lowercased before comparison | DE booleans arrive as inconsistent strings |
| Loops capped | A data error should not time out the send |
| Test send with the debug footer | Confirms the logic, not just the rendering |
| Litmus across Outlook, Gmail, Apple Mail, dark mode | Rendering is separate from logic |
