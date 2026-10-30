<script runat="server">
  /*
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
      var course    = Request.GetFormField("courseCode");
      var optIn     = Request.GetFormField("optIn") == "on";

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

      if (!emailOk) {
        response.message = "Please enter a valid email address.";
      } else if (!course) {
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
