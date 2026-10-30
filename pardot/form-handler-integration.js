/*
  ==========================================================================
  NORTHWIND LEARNING | CUSTOM FORM -> PARDOT FORM HANDLER
  Author: Faisal Irfan | github.com/faisal8143
  --------------------------------------------------------------------------
  Posts a custom website form to a Pardot (Account Engagement) form
  handler without leaving the page, while keeping Pardot's visitor
  tracking (cookies) and completion actions working.
    - Client-side validation with accessible error messages
    - Submits via a hidden iframe (form handlers do not support CORS)
    - UTM and GCLID values captured into hidden fields for attribution
    - Prevents double submits; shows a success state
  ==========================================================================
*/
(function () {
  var HANDLER_URL = "https://go.example.edu/l/000000/2026-10-30/abcde"; /* form handler endpoint */
  var form = document.getElementById("enquiry-form");
  if (!form) return;

  /* 1. Capture attribution parameters into hidden fields */
  var params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "gclid"].forEach(function (key) {
    var field = form.querySelector('[name="' + key + '"]');
    if (field && params.get(key)) field.value = params.get(key);
  });

  /* 2. Hidden iframe target keeps the visitor on the page */
  var frame = document.createElement("iframe");
  frame.name = "pardot-target";
  frame.title = "Form submission";
  frame.hidden = true;
  document.body.appendChild(frame);

  function setError(input, message) {
    var id = input.id + "-error";
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("p");
      el.id = id;
      el.className = "field-error";
      input.insertAdjacentElement("afterend", el);
    }
    el.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.setAttribute("aria-describedby", id);
  }

  function validate() {
    var ok = true;
    var email = form.elements.email;
    var name = form.elements.first_name;
    setError(name, name.value.trim() ? "" : "Please enter your first name.");
    setError(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? "" : "Please enter a valid email address.");
    if (!name.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) ok = false;
    return ok;
  }

  form.addEventListener("submit", function (e) {
    if (!validate()) { e.preventDefault(); return; }
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Sending...";
    form.action = HANDLER_URL;
    form.method = "post";
    form.target = "pardot-target";
    frame.addEventListener("load", function () {
      form.hidden = true;
      var done = document.getElementById("enquiry-success");
      if (done) { done.hidden = false; done.focus(); }
    }, { once: true });
  });
})();
