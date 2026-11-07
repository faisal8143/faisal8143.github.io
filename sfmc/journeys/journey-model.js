/*
  ==========================================================================
  NORTHWIND LEARNING | ENROLMENT NURTURE JOURNEY — MODEL
  Author: Faisal Irfan | github.com/faisal8143
  --------------------------------------------------------------------------
  The journey as data: activities, the paths between them, and the rules each
  split evaluates. The simulator walks a contact through this structure and
  records why every decision went the way it did.

  Mirrors a Journey Builder canvas one-for-one:
    entry       Data Extension entry source, re-entry rules
    wait        duration or until a date attribute
    email       a send, with the engagement it may produce
    decision    attribute-based split (data at that moment)
    engagement  behaviour split (opened / clicked within a window)
    update      Update Contact / Sales Cloud activity
    goal        exit the moment the goal is met
  ==========================================================================
*/
window.JOURNEY = {
  name: 'Enrolment nurture',
  goal: { label: 'Application submitted', field: 'applied' },
  exitAfterDays: 30,

  /* x,y are canvas coordinates in a 1000 x 560 viewBox */
  nodes: [
    { id: 'entry',   type: 'entry',      x:  62, y: 270, label: 'Course_Enquiries',
      sub: 'Entry source · no re-entry while in journey' },

    { id: 'wait1',   type: 'wait',       x: 182, y: 270, label: '1 hour', sub: 'Wait', hours: 1 },

    { id: 'email1',  type: 'email',      x: 294, y: 270, label: 'Enquiry received',
      sub: 'Email 1 · transactional tone' },

    { id: 'wait2',   type: 'wait',       x: 406, y: 270, label: '3 days', sub: 'Wait', hours: 72 },

    { id: 'eng1',    type: 'engagement', x: 522, y: 270, label: 'Opened Email 1?',
      sub: 'Engagement split · 3-day window' },

    { id: 'email2a', type: 'email',      x: 650, y: 148, label: 'Course detail',
      sub: 'Email 2A · engaged path' },
    { id: 'email2b', type: 'email',      x: 650, y: 392, label: 'Still deciding?',
      sub: 'Email 2B · re-engagement' },

    { id: 'split',   type: 'decision',   x: 778, y: 270, label: 'Score >= 40?',
      sub: 'Decision split · EngagementScore' },

    { id: 'hot',     type: 'update',     x: 906, y: 128, label: 'Sales task + SMS',
      sub: 'Hot path · advisor calls within 24h' },
    { id: 'nurture', type: 'email',      x: 906, y: 412, label: 'Monthly nurture',
      sub: 'Warm path · keeps the contact live' },

    { id: 'wait3',   type: 'wait',       x: 1034, y: 270, label: '5 days', sub: 'Wait', hours: 120 },

    { id: 'email3',  type: 'email',      x: 1146, y: 270, label: 'Closing soon',
      sub: 'Email 3 · deadline reminder' }
  ],

  edges: [
    { from: 'entry',   to: 'wait1' },
    { from: 'wait1',   to: 'email1' },
    { from: 'email1',  to: 'wait2' },
    { from: 'wait2',   to: 'eng1' },
    { from: 'eng1',    to: 'email2a', label: 'Yes',  path: 'yes' },
    { from: 'eng1',    to: 'email2b', label: 'No',   path: 'no' },
    { from: 'email2a', to: 'split' },
    { from: 'email2b', to: 'split' },
    { from: 'split',   to: 'hot',     label: 'Hot',  path: 'yes' },
    { from: 'split',   to: 'nurture', label: 'Warm', path: 'no' },
    { from: 'hot',     to: 'wait3' },
    { from: 'nurture', to: 'wait3' },
    { from: 'wait3',   to: 'email3' }
  ],

  /* Each contact carries the behaviour the simulator replays against the
     journey. These are the rows and events Journey Builder would see. */
  contacts: [
    {
      id: 'priya',
      name: 'Priya Mehta',
      blurb: 'Opens fast, high score, applies on day 6',
      attributes: { CourseName: 'Diploma of Business', EngagementScore: 55 },
      events: [
        { afterHours: 2,   type: 'open',  of: 'email1' },
        { afterHours: 3,   type: 'click', of: 'email1' },
        { afterHours: 148, type: 'goal',  note: 'Submitted an application' }
      ]
    },
    {
      id: 'tom',
      name: 'Tom Whitfield',
      blurb: 'Ignores Email 1, re-engages on the second',
      attributes: { CourseName: 'Bachelor of IT', EngagementScore: 25 },
      events: [
        { afterHours: 120, type: 'open', of: 'email2b' }
      ]
    },
    {
      id: 'mei',
      name: 'Mei Chen',
      blurb: 'Opens, but score stays low — warm path',
      attributes: { CourseName: 'Grad Cert Data Analytics', EngagementScore: 18 },
      events: [
        { afterHours: 30, type: 'open', of: 'email1' }
      ]
    },
    {
      id: 'jordan',
      name: 'Jordan Blake',
      blurb: 'Unsubscribes after Email 1 — exits immediately',
      attributes: { CourseName: 'Undecided', EngagementScore: 5 },
      events: [
        { afterHours: 26, type: 'unsubscribe', note: 'Clicked unsubscribe in Email 1' }
      ]
    }
  ]
};
