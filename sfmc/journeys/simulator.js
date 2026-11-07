/*
  ==========================================================================
  JOURNEY BUILDER SIMULATOR
  Author: Faisal Irfan | github.com/faisal8143
  --------------------------------------------------------------------------
  Walks one contact through the journey model, evaluating each activity the
  way Journey Builder would and recording WHY every decision went as it did.

  The part people get wrong in interviews: goal and exit criteria are checked
  continuously, not at the end. A contact who meets the goal inside a wait
  leaves the journey there and never receives the rest of the sends. The
  stepper below models that, which is why Priya exits mid-wait on day 6.
  ==========================================================================
*/
(function () {
  'use strict';
  var J = window.JOURNEY;

  var NODE = {};
  J.nodes.forEach(function (n) { NODE[n.id] = n; });

  function edgesFrom(id) { return J.edges.filter(function (e) { return e.from === id; }); }

  function fmt(h) {
    if (h < 1) return 'start';
    if (h < 24) return 'hour ' + Math.round(h);
    var d = h / 24;
    return 'day ' + (d % 1 === 0 ? d : d.toFixed(1));
  }

  /* --------------------------------------------------------------------
     Build the full step list for one contact.
     Each step: node, hour, status, reason.
     -------------------------------------------------------------------- */
  function simulate(contact) {
    var steps = [];
    var hour = 0;
    var id = 'entry';
    var sent = [];
    var guard = 0;

    /* Events that cut the journey short, checked between every activity */
    function interrupt(fromHour, toHour) {
      var hit = null;
      contact.events.forEach(function (ev) {
        if (ev.afterHours <= fromHour || ev.afterHours > toHour) return;
        if (ev.type === 'goal' || ev.type === 'unsubscribe') {
          if (!hit || ev.afterHours < hit.afterHours) hit = ev;
        }
      });
      return hit;
    }

    function opened(emailId, byHour, windowHours) {
      var sentAt = sent[emailId];
      if (sentAt === undefined) return null;
      var found = null;
      contact.events.forEach(function (ev) {
        if (ev.of !== emailId) return;
        if (ev.type !== 'open' && ev.type !== 'click') return;
        if (ev.afterHours < sentAt || ev.afterHours > byHour) return;
        if (!found || ev.afterHours < found.afterHours) found = ev;
      });
      return found;
    }

    while (id && guard++ < 40) {
      var n = NODE[id];

      if (n.type === 'wait') {
        var until = hour + n.hours;
        var cut = interrupt(hour, until);
        if (cut) {
          steps.push({
            node: n.id, hour: hour, status: 'wait',
            reason: 'Waiting ' + n.label + '. Goal and exit criteria stay live during a wait.'
          });
          steps.push({
            node: cut.type === 'goal' ? 'goal' : 'exit',
            hour: cut.afterHours,
            status: cut.type === 'goal' ? 'goal' : 'exit',
            reason: cut.type === 'goal'
              ? cut.note + ' on ' + fmt(cut.afterHours) + '. Goal met, so the contact exits here and receives nothing further.'
              : cut.note + ' on ' + fmt(cut.afterHours) + '. Exit criteria met, journey ends.'
          });
          return steps;
        }
        steps.push({
          node: n.id, hour: hour, status: 'done',
          reason: 'Waited ' + n.label + ', resuming at ' + fmt(until) + '.'
        });
        hour = until;
        id = (edgesFrom(id)[0] || {}).to;
        continue;
      }

      if (n.type === 'entry') {
        steps.push({
          node: n.id, hour: 0, status: 'done',
          reason: 'Entered from Course_Enquiries with ' + contact.attributes.CourseName +
                  ' and EngagementScore ' + contact.attributes.EngagementScore + '.'
        });
        id = (edgesFrom(id)[0] || {}).to;
        continue;
      }

      if (n.type === 'email') {
        sent[n.id] = hour;
        steps.push({
          node: n.id, hour: hour, status: 'done',
          reason: 'Sent "' + n.label + '" on ' + fmt(hour) + '.'
        });
        id = (edgesFrom(id)[0] || {}).to;
        continue;
      }

      if (n.type === 'engagement') {
        var ev = opened('email1', hour, 72);
        var yes = !!ev;
        steps.push({
          node: n.id, hour: hour, status: yes ? 'yes' : 'no',
          reason: yes
            ? 'Opened Email 1 on ' + fmt(ev.afterHours) + ', inside the 3-day window, so the contact takes the engaged path.'
            : 'No open on Email 1 within 3 days, so the contact takes the re-engagement path. The window matters: an open on day 4 arrives after the split has already evaluated.'
        });
        var e = edgesFrom(n.id).filter(function (x) { return x.path === (yes ? 'yes' : 'no'); })[0];
        id = e && e.to;
        continue;
      }

      if (n.type === 'decision') {
        var score = contact.attributes.EngagementScore;
        var hot = score >= 40;
        steps.push({
          node: n.id, hour: hour, status: hot ? 'yes' : 'no',
          reason: 'EngagementScore is ' + score + '. ' + (hot
            ? 'At or above 40, so the contact is routed to the hot path.'
            : 'Below 40, so the contact continues on the warm nurture path.') +
            ' A decision split reads the attribute as it stands at this moment, not at entry.'
        });
        var e2 = edgesFrom(n.id).filter(function (x) { return x.path === (hot ? 'yes' : 'no'); })[0];
        id = e2 && e2.to;
        continue;
      }

      if (n.type === 'update') {
        steps.push({
          node: n.id, hour: hour, status: 'done',
          reason: 'Created a Sales Cloud task and sent the advisor SMS. Advisor calls within 24 hours.'
        });
        id = (edgesFrom(id)[0] || {}).to;
        continue;
      }

      id = (edgesFrom(id)[0] || {}).to;
    }

    steps.push({
      node: 'end', hour: hour, status: 'end',
      reason: 'Reached the end of the journey without meeting the goal. Exits automatically after ' +
              J.exitAfterDays + ' days.'
    });
    return steps;
  }

  window.simulateJourney = simulate;
  window.JOURNEY_NODE = NODE;
  window.journeyEdgesFrom = edgesFrom;
  window.journeyFmtHour = fmt;
})();
