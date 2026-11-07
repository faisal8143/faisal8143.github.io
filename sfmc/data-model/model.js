/*
  ==========================================================================
  NORTHWIND LEARNING | CONTACT BUILDER DATA MODEL
  Author: Faisal Irfan | github.com/faisal8143
  --------------------------------------------------------------------------
  The data model behind the journey and the emails, expressed the way Contact
  Builder actually holds it: attribute groups, the data extensions inside
  them, and the relationships that link each one back to the Contact Key.

  The distinction that matters, and that gets missed most often:

    Contact Key    Identifies the PERSON across every channel and every
                   attribute group. Set in Contact Builder. Immutable.
    Subscriber Key Identifies the person in the EMAIL channel's All
                   Subscribers list. For an email-only org these look the
                   same, which is why the difference stays invisible until
                   SMS or push is added and the same person arrives twice.

  Relationship cardinality decides what a journey can do. A one-to-one
  attribute can be used in a decision split directly. A one-to-many has to
  be aggregated first, because a split cannot evaluate forty rows.
  ==========================================================================
*/
window.DATA_MODEL = {
  contactKey: 'EmailAddress (lowercased)',

  groups: [
    {
      id: 'identity', name: 'Identity', kind: 'system', x: 430, y: 60,
      blurb: 'The single source of truth for who a person is. Every other group links back to this key.',
      des: [
        { name: 'Contact Record', pk: 'ContactKey', fields: [
          'ContactKey (Text 254, PK)', 'ContactID (Number, system)', 'EmailAddress (EmailAddress)',
          'FirstName (Text 50)', 'LastName (Text 50)', 'MobileNumber (Phone)', 'CreatedDate (Date)'
        ], note: 'Populated by Contact Builder. Never written to directly by an automation.' }
      ]
    },
    {
      id: 'enquiry', name: 'Enquiries', kind: 'group', x: 120, y: 240,
      blurb: 'Every course enquiry a person submits. One contact can have many enquiries, so anything a journey splits on has to be aggregated to one row first.',
      des: [
        { name: 'Course_Enquiries_Raw', pk: 'EnquiryID', card: 'many', fields: [
          'EnquiryID (Text 36, PK)', 'SubscriberKey (Text 254, FK)', 'EmailAddress (EmailAddress)',
          'CourseCode (Text 20)', 'CourseName (Text 100)', 'Fee (Decimal 10,2)',
          'EnquiryDate (Date)', 'Source (Text 50)'
        ], note: 'Landing page writes here. Append-only, never overwritten, so the full history survives.' },
        { name: 'Course_Enquiries', pk: 'SubscriberKey', card: 'one', fields: [
          'SubscriberKey (Text 254, PK)', 'CourseCode (Text 20)', 'CourseName (Text 100)',
          'Fee (Decimal 10,2)', 'EnquiryDate (Date)'
        ], note: 'One row per person: the latest enquiry, built by a ROW_NUMBER query every 15 minutes. This is the one AMPscript reads.' }
      ]
    },
    {
      id: 'status', name: 'Student status', kind: 'group', x: 430, y: 240,
      blurb: 'Derived attributes, rebuilt on a schedule rather than written by hand. Everything a decision split reads lives here.',
      des: [
        { name: 'Student_Status', pk: 'SubscriberKey', card: 'one', fields: [
          'SubscriberKey (Text 254, PK)', 'IsReturning (Boolean)', 'EngagementScore (Number)',
          'Segment (Text 10)', 'LastCalculated (Date)'
        ], note: 'Overwritten nightly from the engagement query. A journey decision split reads EngagementScore from here.' },
        { name: 'Engagement_Score_90d', pk: 'SubscriberKey', card: 'one', fields: [
          'SubscriberKey (Text 254, PK)', 'Opens90d (Number)', 'Clicks90d (Number)',
          'EngagementScore (Number)', 'Segment (Text 10)', 'CalculatedAt (Date)'
        ], note: 'Built from the _Open, _Click and _Bounce data views. Overwrite, not append: the score is a current state, not a log.' }
      ]
    },
    {
      id: 'consent', name: 'Consent & preferences', kind: 'group', x: 740, y: 240,
      blurb: 'What a person agreed to receive. Kept separate from profile data so a preference change never depends on a profile update succeeding.',
      des: [
        { name: 'Subscriber_Preferences', pk: 'SubscriberKey', card: 'one', fields: [
          'SubscriberKey (Text 254, PK)', 'News (Boolean)', 'Events (Boolean)',
          'Offers (Boolean)', 'Frequency (Text 10)', 'UpdatedAt (Date)'
        ], note: 'Written by the preference centre CloudPage. Topic-level opt-outs live here; a global unsubscribe goes to All Subscribers via LogUnsubEvent, not here.' },
        { name: 'Suppression_Manual', pk: 'SubscriberKey', card: 'one', fields: [
          'SubscriberKey (Text 254, PK)', 'Reason (Text 100)', 'AddedBy (Text 50)', 'AddedDate (Date)'
        ], note: 'Client-supplied do-not-contact list. Checked in the audience query, never relied on as the only guard.' }
      ]
    },
    {
      id: 'send', name: 'Sendable audience', kind: 'sendable', x: 430, y: 430,
      blurb: 'What a send actually points at. Built fresh per campaign, with the suppression reason kept on a companion table so an audience drop is explainable.',
      des: [
        { name: 'Campaign_Audience', pk: 'SubscriberKey', card: 'one', sendable: true, fields: [
          'SubscriberKey (Text 254, PK, sendable)', 'EmailAddress (EmailAddress, relates on Subscriber Key)',
          'CourseCode (Text 20)', 'CourseName (Text 100)', 'EngagementScore (Number)',
          'Segment (Text 10)', 'HasEnquiry (Boolean)', 'BuiltAt (Date)'
        ], note: 'Sendable and testable. Overwrite on each build so a stale row can never be sent to.' },
        { name: 'Campaign_Suppressed', pk: 'SubscriberKey', card: 'one', fields: [
          'SubscriberKey (Text 254, PK)', 'Reason (Text 50)', 'BuiltAt (Date)'
        ], note: 'The other half of the audience build. "Why is the list 4,000 smaller than last month" takes one query, not an afternoon.' }
      ]
    }
  ],

  links: [
    { from: 'enquiry', to: 'identity', card: '1:M', label: 'SubscriberKey → ContactKey' },
    { from: 'status',  to: 'identity', card: '1:1', label: 'SubscriberKey → ContactKey' },
    { from: 'consent', to: 'identity', card: '1:1', label: 'SubscriberKey → ContactKey' },
    { from: 'send',    to: 'enquiry',  card: 'build', label: 'latest enquiry' },
    { from: 'send',    to: 'status',   card: 'build', label: 'score + segment' },
    { from: 'send',    to: 'consent',  card: 'build', label: 'suppression' }
  ],

  /* Design rules worth being asked about in an interview */
  rules: [
    { t: 'Raw and shaped are different tables',
      d: 'Course_Enquiries_Raw is append-only so nothing is ever lost. Course_Enquiries is overwritten to one row per person so AMPscript and journey splits have a single predictable row to read. Collapsing these into one table is the most common cause of "why did this contact get two emails".' },
    { t: 'One-to-many cannot drive a split',
      d: 'A decision split evaluates one value. An attribute sitting on a one-to-many relationship has to be aggregated into a one-to-one table first, which is what the 15-minute dedupe query exists for.' },
    { t: 'Derived values are rebuilt, never edited',
      d: 'EngagementScore is overwritten by a scheduled query. Nothing writes to it by hand, so the value can always be explained by re-running the query.' },
    { t: 'Consent is its own group',
      d: 'Preferences are kept apart from profile data so a preference update never depends on a profile import succeeding. Topic opt-outs live in the DE; a global unsubscribe goes to All Subscribers through LogUnsubEvent so every channel honours it.' },
    { t: 'Contact Key is not Subscriber Key',
      d: 'Contact Key identifies the person across channels; Subscriber Key identifies them in the email channel. In an email-only org they look identical, which hides the problem until SMS or push arrives and the same person is created twice.' },
    { t: 'The sendable DE is disposable',
      d: 'Campaign_Audience is rebuilt per send and overwritten. Nothing of value lives only there, so it can be dropped and rebuilt at any time without losing history.' }
  ]
};
