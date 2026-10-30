<script runat="server">
  /*
    ========================================================================
    NORTHWIND LEARNING | SSJS CLOUDPAGE FORM HANDLER
    Author: Faisal Irfan | github.com/faisal8143
    Data Extensions: Course_Enquiries (PK SubscriberKey), CloudPage_Error_Log
    ========================================================================
    CloudPage form handler
    - Accepts a POST from a preference / enquiry form
    - Validates and sanitises input
    - Upserts into a Data Extension keyed on SubscriberKey
    - Returns JSON so the front end can show success/error states
  */
  Platform.Load("core", "1.1.1");

  var response = { ok: false, message: "" };

  try {
    if (Request.Method() != "POST") {
      response.message = "Invalid request method.";
    } else {
      var email     = Request.GetFormField("email");
      var firstName = Request.GetFormField("firstName");
      var course    = String(Request.GetFormField("courseCode") || "").toUpperCase();
      var optIn     = Request.GetFormField("optIn") == "on";
      var honeypot  = Request.GetFormField("website"); /* hidden field, bots fill it */

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") && String(email).length <= 254;
      var courseOk = /^[A-Z0-9_-]{2,20}$/.test(course || "");

      if (honeypot) {
        /* Silently accept so bots get no signal, but store nothing */
        response.ok = true;
        response.message = "Thanks! We will be in touch shortly.";
      } else if (!emailOk) {
        response.message = "Please enter a valid email address.";
      } else if (!courseOk) {
        response.message = "Please choose a course.";
      } else {
        var key = String(email).toLowerCase();

        var de = DataExtension.Init("Course_Enquiries");
        de.Rows.Upsert(
          { SubscriberKey: key },
          ["EmailAddress", "FirstName", "CourseCode", "OptIn", "EnquiryDate"],
          [key, String(firstName || "").substring(0, 50), course, optIn, Platform.Function.Now()]
        );

        response.ok = true;
        response.message = "Thanks! We will be in touch shortly.";
      }
    }
  } catch (e) {
    /* Log the error to a DE instead of exposing details to the visitor */
    try {
      DataExtension.Init("CloudPage_Error_Log").Rows.Add({
        Page: "enquiry-handler",
        Error: Stringify(e).substring(0, 4000),
        LoggedAt: Platform.Function.Now()
      });
    } catch (ignore) {}
    response.message = "Something went wrong. Please try again.";
  }

  Platform.Response.SetResponseHeader("Content-Type", "application/json");
  Write(Stringify(response));
</script>
