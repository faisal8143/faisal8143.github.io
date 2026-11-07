/*
  ==========================================================================
  NORTHWIND LEARNING | GOHIGHLEVEL ATTRIBUTION + FORM ENHANCEMENTS
  Author: Faisal Irfan | github.com/faisal8143
  --------------------------------------------------------------------------
  Paste into: Funnel > Settings > Tracking Code > Footer.

  Solves the four things GHL funnels lose by default:

    1. ATTRIBUTION SURVIVES THE FUNNEL
       GHL embeds forms in an iframe, so utm_* parameters on the parent URL
       never reach the form. They are also lost on step 2 of any funnel.
       Fixed by persisting first-touch values and appending them to every
       form iframe src on the page.

    2. NO DOUBLE SUBMITS
       The native submit button stays live while the request is in flight,
       so an impatient click creates duplicate contacts and fires the
       workflow twice.

    3. SUBMISSION EVENTS REACH GTM
       GHL posts a message to the parent window on submit, but nothing
       listens, so GA4/Ads conversions never fire from a funnel step.

    4. SCROLL + ENGAGEMENT SIGNAL
       Pushes a single qualified-engagement event so CRO tests have a
       secondary metric when conversion volume is thin.

  Dependencies: none. Safe to load on every funnel step.
  ==========================================================================
*/
(function () {
  'use strict';

  var CONFIG = {
    storageKey: 'nw_attr',
    /* Parameters mapped to GHL custom fields of the same name */
    params: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
             'gclid', 'fbclid', 'msclkid', 'ttclid'],
    /* First touch wins: a visitor who arrives on paid then returns direct
       should still be attributed to the paid click */
    firstTouch: true,
    formSelector: 'iframe[src*="leadconnectorhq.com"], iframe[src*="msgsndr.com"], iframe.ghl-form-iframe',
    engagementDepth: 0.5,     // fraction of the page scrolled
    engagementSeconds: 20
  };

  /* ---------------------------------------------------------------------
     1. Capture and persist attribution
     --------------------------------------------------------------------- */

  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(CONFIG.storageKey)) || {}; }
    catch (e) { return {}; }
  }

  function writeStore(data) {
    try { sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); } catch (e) {}
  }

  function collect() {
    var qs = new URLSearchParams(window.location.search);
    var stored = readStore();
    var out = {};

    CONFIG.params.forEach(function (key) {
      var fresh = qs.get(key);
      if (CONFIG.firstTouch) {
        out[key] = stored[key] || fresh || '';
      } else {
        out[key] = fresh || stored[key] || '';
      }
    });

    /* Referrer is only meaningful on the entry page of the session */
    out.referrer = stored.referrer ||
      (document.referrer && document.referrer.indexOf(location.hostname) === -1 ? document.referrer : 'direct');
    out.landing_page = stored.landing_page || location.href.split('#')[0];

    writeStore(out);
    return out;
  }

  var attribution = collect();

  /* ---------------------------------------------------------------------
     2. Push attribution into every GHL form iframe
     GHL reads query parameters off the iframe src and maps them onto
     custom fields with matching keys.
     --------------------------------------------------------------------- */

  function decorate(iframe) {
    if (iframe.dataset.nwDecorated) return;

    var src = iframe.getAttribute('src');
    if (!src) return;

    var url;
    try { url = new URL(src, location.origin); } catch (e) { return; }

    var added = false;
    Object.keys(attribution).forEach(function (key) {
      if (attribution[key] && !url.searchParams.has(key)) {
        url.searchParams.set(key, attribution[key]);
        added = true;
      }
    });

    iframe.dataset.nwDecorated = '1';
    /* Only reload the iframe when something actually changed */
    if (added) iframe.setAttribute('src', url.toString());
  }

  function decorateAll() {
    document.querySelectorAll(CONFIG.formSelector).forEach(decorate);
  }

  decorateAll();

  /* GHL injects forms after page load and on step transitions */
  if (window.MutationObserver) {
    new MutationObserver(decorateAll).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /* Carry attribution onto internal links so the next funnel step keeps it
     even if sessionStorage is blocked */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel):/.test(href)) return;

    var url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.hostname !== location.hostname) return;

    CONFIG.params.forEach(function (key) {
      if (attribution[key] && !url.searchParams.has(key)) url.searchParams.set(key, attribution[key]);
    });
    a.setAttribute('href', url.toString());
  }, true);

  /* ---------------------------------------------------------------------
     3. Double-submit guard on native GHL forms rendered inline
     --------------------------------------------------------------------- */

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('.hl_form-builder, .ghl-form, form[data-ghl]')) return;

    if (form.dataset.nwSubmitting === '1') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    form.dataset.nwSubmitting = '1';

    var btn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.dataset.nwLabel = btn.textContent;
      btn.textContent = 'Sending…';
    }

    /* Release after 12s so a failed request does not strand the visitor */
    setTimeout(function () {
      form.dataset.nwSubmitting = '';
      if (btn) {
        btn.disabled = false;
        if (btn.dataset.nwLabel) btn.textContent = btn.dataset.nwLabel;
      }
    }, 12000);
  }, true);

  /* ---------------------------------------------------------------------
     4. Relay GHL's iframe submission message to the data layer
     --------------------------------------------------------------------- */

  window.addEventListener('message', function (event) {
    if (!/leadconnectorhq\.com|msgsndr\.com/.test(event.origin)) return;

    var data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    if (!data || !data.type) return;

    if (data.type === 'form-submitted' || data.type === 'hl_form_submit') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'generate_lead',
        form_id: data.formId || '',
        funnel_step: document.body.dataset.step || location.pathname,
        utm_source: attribution.utm_source || '',
        utm_campaign: attribution.utm_campaign || ''
      });
    }

    /* GHL sends the iframe's rendered height; without this the form is
       cut off on mobile whenever a validation message appears */
    if (data.type === 'resize' && data.height) {
      document.querySelectorAll(CONFIG.formSelector).forEach(function (f) {
        if (f.contentWindow === event.source) f.style.height = data.height + 'px';
      });
    }
  }, false);

  /* ---------------------------------------------------------------------
     5. Qualified engagement, fired once
     --------------------------------------------------------------------- */

  (function engagement() {
    var fired = false, deep = false, stayed = false;

    function maybe() {
      if (fired || !deep || !stayed) return;
      fired = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'qualified_engagement', page: location.pathname });
    }

    setTimeout(function () { stayed = true; maybe(); }, CONFIG.engagementSeconds * 1000);

    window.addEventListener('scroll', function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= CONFIG.engagementDepth) {
        deep = true;
        window.removeEventListener('scroll', onScroll);
        maybe();
      }
    }, { passive: true });
  })();
})();
