/*
  Wires the mini AMPscript interpreter to the subscriber picker.
  Author: Faisal Irfan | github.com/faisal8143
*/
(function () {
  'use strict';

  /* The AMPscript block, identical to sfmc/ampscript/template.amp */
  var AMPSCRIPT = [
'%%[',
'/* 1. Greeting. Never render "Hi ," */',
'SET @firstName = AttributeValue("FirstName")',
'IF Empty(@firstName) THEN',
'  SET @firstName = "there"',
'ELSE',
'  SET @firstName = ProperCase(Trim(@firstName))',
'ENDIF',
'',
'/* 2. Most recent enquiry, with a neutral fallback */',
'SET @rows = LookupOrderedRows("Course_Enquiries", 1, "EnquiryDate DESC", "SubscriberKey", _subscriberkey)',
'IF RowCount(@rows) > 0 THEN',
'  SET @row        = Row(@rows, 1)',
'  SET @courseName = Field(@row, "CourseName")',
'  SET @courseCode = Field(@row, "CourseCode")',
'  SET @fee        = Field(@row, "Fee")',
'  SET @hasEnquiry = true',
'ELSE',
'  SET @courseName = "your chosen course"',
'  SET @courseCode = "GENERAL"',
'  SET @fee        = 0',
'  SET @hasEnquiry = false',
'ENDIF',
'',
'/* 3. Term and deadline */',
'SET @termName = Lookup("Term_Config", "TermName",  "IsCurrent", "true")',
'SET @closeRaw = Lookup("Term_Config", "CloseDate", "IsCurrent", "true")',
'IF Empty(@termName) THEN SET @termName = "the upcoming term" ENDIF',
'SET @closeDate = FormatDate(@closeRaw, "d MMMM yyyy")',
'SET @daysLeft  = DateDiff(Now(), @closeRaw, "D")',
'',
'/* 4. Urgency tier drives the banner */',
'IF @daysLeft <= 7 THEN',
'  SET @urgency = "closing"',
'  SET @banner  = Concat("Applications close in ", @daysLeft, " days")',
'ELSEIF @daysLeft <= 30 THEN',
'  SET @urgency = "soon"',
'  SET @banner  = Concat("Applications close on ", @closeDate)',
'ELSE',
'  SET @urgency = "open"',
'  SET @banner  = Concat("Enrolments are open for ", @termName)',
'ENDIF',
'',
'/* 5. Engagement score decides the call to action */',
'SET @score = Lookup("Student_Status", "EngagementScore", "SubscriberKey", _subscriberkey)',
'IF Empty(@score) THEN SET @score = 0 ENDIF',
'IF @score >= 40 THEN',
'  SET @segment = "Hot"',
'  SET @ctaText = "Finish your application"',
'  SET @ctaPath = "/apply"',
'ELSEIF @score >= 20 THEN',
'  SET @segment = "Warm"',
'  SET @ctaText = "Talk to an advisor"',
'  SET @ctaPath = "/advisor"',
'ELSE',
'  SET @segment = "Cold"',
'  SET @ctaText = "Explore the course"',
'  SET @ctaPath = "/courses"',
'ENDIF',
'',
'/* 6. Returning students skip the intro block */',
'SET @isReturning = Lookup("Student_Status", "IsReturning", "SubscriberKey", _subscriberkey)',
'',
'/* 7. Tracked CTA with UTM parameters */',
'SET @ctaUrl = Concat("https://example.edu", @ctaPath, "?course=", URLEncode(@courseCode),',
'                     "&utm_source=sfmc&utm_medium=email&utm_campaign=enrolment_reminder")',
'',
'/* 8. Fee, formatted for display */',
'IF @fee > 0 THEN',
'  SET @feeDisplay = FormatNumber(@fee, "C")',
'ELSE',
'  SET @feeDisplay = ""',
'ENDIF',
']%%'
  ].join('\n');

  /* The email body. Same markup for everyone. */
  var BODY = [
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<style>body{margin:0;background:#F2F4F7;font-family:Arial,Helvetica,sans-serif;color:#334155}',
'.w{max-width:600px;margin:0 auto;background:#fff}',
'.bar{padding:12px 24px;font-size:13px;font-weight:bold;text-align:center;color:#fff}',
'.bar.closing{background:#B91C1C}.bar.soon{background:#0B5CAD}.bar.open{background:#0F766E}',
'.hd{padding:22px 32px;border-bottom:1px solid #E2E8F0;font-size:19px;font-weight:bold;color:#0A1F44;letter-spacing:-.3px}',
'.bd{padding:30px 32px}',
'h1{font-size:26px;line-height:1.25;color:#0A1F44;margin:0 0 14px}',
'p{font-size:15.5px;line-height:1.65;margin:0 0 16px}',
'.card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin:0 0 20px}',
'.card .lbl{font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#0F766E;margin:0 0 4px}',
'.card .cn{font-size:17px;font-weight:bold;color:#0A1F44;margin:0 0 3px}',
'.card .fee{font-size:14px;color:#64748B;margin:0}',
'.btn{display:inline-block;background:#0B5CAD;color:#fff!important;font-size:16px;font-weight:bold;',
'text-decoration:none;padding:14px 32px;border-radius:8px}',
'.ret{background:#EEF4FF;border-left:4px solid #0B5CAD;padding:13px 16px;margin:0 0 20px;font-size:14.5px}',
'.ft{padding:22px 32px;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.6;color:#64748B}',
'</style></head><body><div class="w">',
'<div class="bar %%=v(@urgency)=%%">%%=v(@banner)=%%</div>',
'<div class="hd">Northwind Learning</div>',
'<div class="bd">',
'<h1>Hi %%=v(@firstName)=%%, your place in %%=v(@termName)=%% is waiting</h1>',
'',
'%%[ IF @isReturning == "true" THEN ]%%',
'<div class="ret"><b>Welcome back.</b> Your credits from last term carry over automatically, so you can pick up where you left off.</div>',
'%%[ ELSE ]%%',
'<p>New to Northwind? Every course is designed with industry partners and delivered fully online, so you can fit study around work.</p>',
'%%[ ENDIF ]%%',
'',
'%%[ IF @hasEnquiry == true THEN ]%%',
'<div class="card"><p class="lbl">You enquired about</p><p class="cn">%%=v(@courseName)=%%</p><p class="fee">%%=v(@feeDisplay)=%% per year &middot; course code %%=v(@courseCode)=%%</p></div>',
'%%[ ELSE ]%%',
'<div class="card"><p class="lbl">Not sure yet?</p><p class="cn">120+ online courses to choose from</p><p class="fee">An advisor can narrow it down in 15 minutes.</p></div>',
'%%[ ENDIF ]%%',
'',
'%%[ IF @urgency == "closing" THEN ]%%',
'<p><b>Only %%=v(@daysLeft)=%% days left.</b> Applications for %%=v(@termName)=%% close on %%=v(@closeDate)=%%, and late applications roll into the next intake.</p>',
'%%[ ELSE ]%%',
'<p>Applications for %%=v(@termName)=%% close on %%=v(@closeDate)=%%. There is still time to get everything together.</p>',
'%%[ ENDIF ]%%',
'',
'<p style="margin:26px 0 0"><a class="btn" href="%%=v(@ctaUrl)=%%">%%=v(@ctaText)=%%</a></p>',
'</div>',
'<div class="ft">You are receiving this because you enquired with Northwind Learning.<br>',
'Level 10, 100 Example Street, Melbourne VIC 3000<br>',
'<span style="color:#94A3B8">Segment: %%=v(@segment)=%% &middot; score %%=v(@score)=%% &middot; days to close %%=v(@daysLeft)=%%</span></div>',
'</div></body></html>'
  ].join('\n');

  var SUBJECTS = {
    closing: 'Only {d} days left to apply',
    soon: 'Applications close {c}',
    open: '{t} enrolments are open'
  };

  /* ---------------------------------------------------------- rendering */
  function build(i) {
    var s = window.DEMO.subscribers[i];

    /* _subscriberkey and the Term_Config row are what Marketing Cloud
       supplies at send time; here they come from the chosen subscriber. */
    var data = {
      Course_Enquiries: s.data.Course_Enquiries,
      Student_Status: s.data.Student_Status,
      Term_Config: [{ TermName: window.DEMO.termName, CloseDate: s.closeDate, IsCurrent: 'true' }]
    };

    var attrs = {};
    Object.keys(s.attributes).forEach(function (k) { attrs[k] = s.attributes[k]; });
    attrs._subscriberkey = s.key;

    var ctx = { subscriber: attrs, data: data, now: window.DEMO.today };

    /* _subscriberkey is a system variable, not an @variable: resolve it
       before the interpreter sees the code. */
    var code = (AMPSCRIPT + '\n' + BODY).split('_subscriberkey').join('"' + s.key + '"');
    return window.MiniAmp.render(code, ctx);
  }

  /* --------------------------------------------------------------- view */
  var SHOW = ['firstName', 'courseName', 'courseCode', 'fee', 'feeDisplay', 'hasEnquiry',
              'termName', 'closeDate', 'daysLeft', 'urgency', 'banner',
              'score', 'segment', 'ctaText', 'isReturning', 'ctaUrl'];

  function reasons(v, raw) {
    var out = [];
    if (v.firstname === 'there') {
      out.push('FirstName was blank, so the fallback rendered <strong>&ldquo;Hi there&rdquo;</strong> instead of &ldquo;Hi ,&rdquo;.');
    } else if (raw !== v.firstname) {
      out.push('FirstName arrived as <strong>&ldquo;' + esc(raw) + '&rdquo;</strong> and Trim() with ProperCase() normalised it to <strong>' + v.firstname + '</strong>.');
    } else {
      out.push('FirstName <strong>' + v.firstname + '</strong> was already clean, so Trim() and ProperCase() left it unchanged.');
    }
    out.push(v.hasenquiry === true
      ? 'Most recent enquiry row found: <strong>' + v.coursename + '</strong>, picked by EnquiryDate DESC.'
      : 'No Course_Enquiries row at all, so the course block fell back to the <strong>generic 120+ courses</strong> card.');
    out.push('Deadline is <strong>' + v.daysleft + ' days</strong> away, which puts this send in the <strong>' + v.urgency + '</strong> urgency tier.');
    out.push('Engagement score <strong>' + v.score + '</strong> maps to the <strong>' + v.segment + '</strong> segment, so the button reads &ldquo;' + v.ctatext + '&rdquo;.');
    out.push(String(v.isreturning) === 'true'
      ? 'Student_Status says returning, so the <strong>credits-carry-over</strong> block replaced the intro paragraph.'
      : 'Not a returning student, so the <strong>intro paragraph</strong> shows instead of the welcome-back block.');
    return out;
  }

  function show(i) {
    var r = build(i);
    var v = r.vars;

    document.getElementById('out').srcdoc = r.html;

    var sub = SUBJECTS[v.urgency] || '';
    sub = sub.replace('{d}', v.daysleft).replace('{c}', v.closedate).replace('{t}', v.termname);
    document.getElementById('subjectLine').textContent = 'Subject: ' + sub;

    var rows = SHOW.map(function (name) {
      var key = name.toLowerCase();
      var val = v[key];
      var txt = (val === '' || val === undefined) ? '(empty)' : String(val);
      if (txt.length > 70) txt = txt.slice(0, 70) + '…';
      return '<div class="v"><code>@' + name + '</code><em class="' +
             (txt === '(empty)' ? 'empty' : '') + '">' + esc(txt) + '</em></div>';
    }).join('');
    document.getElementById('vars').innerHTML = rows;
    document.getElementById('varCount').textContent = SHOW.length + ' variables';
    document.getElementById('why').innerHTML = reasons(v, window.DEMO.subscribers[i].attributes.FirstName).map(function (t) { return '<li>' + t + '</li>'; }).join('');

    if (r.errors.length) console.warn('AMPscript notes:', r.errors);
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  /* Syntax highlight in ONE pass. Highlighting in several passes lets a
     later pattern match inside text an earlier pass already wrapped, which
     leaves markup fragments in the output. */
  var KEYWORDS = /^(SET|IF|THEN|ELSEIF|ELSE|ENDIF|FOR|NEXT|TO|DOWNTO|DO|AND|OR|NOT|true|false)$/i;
  var FUNCS = /^(AttributeValue|Empty|ProperCase|Uppercase|Lowercase|Trim|LookupOrderedRows|LookupRows|Lookup|RowCount|Row|Field|Concat|Length|Substring|IndexOf|Replace|FormatDate|FormatNumber|Now|DateDiff|DateAdd|Add|Subtract|Multiply|Divide|URLEncode|RedirectTo|IIF)$/i;

  function highlight(src) {
    var re = /(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|(@[A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)/g;
    var out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += esc(src.slice(last, m.index));
      var txt = esc(m[0]), cls = '';
      if (m[1]) cls = 'c';
      else if (m[2]) cls = 's';
      else if (m[3]) cls = 'vr';
      else if (m[4]) cls = KEYWORDS.test(m[4]) ? 'k' : (FUNCS.test(m[4]) ? 'f' : '');
      else if (m[5]) cls = 'n';
      out += cls ? '<span class="' + cls + '">' + txt + '</span>' : txt;
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  document.getElementById('code').innerHTML = highlight(AMPSCRIPT);

  var btns = [].slice.call(document.querySelectorAll('.person'));
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      show(parseInt(b.getAttribute('data-i'), 10));
    });
  });

  show(0);
})();
