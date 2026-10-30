<script runat="server">
  /*
    ========================================================================
    NORTHWIND LEARNING | SSJS WSPROXY TRIGGERED SEND
    Author: Faisal Irfan | github.com/faisal8143
    ------------------------------------------------------------------------
    Sends a transactional "enquiry received" email from a CloudPage using
    WSProxy (faster and lighter than the Core library for SOAP calls).
      - Looks up the Triggered Send Definition by external key
      - Passes personalisation attributes
      - Retries once on a transient error and logs the outcome
    ========================================================================
  */
  Platform.Load("core", "1.1.1");
  var api = new Script.Util.WSProxy();

  function sendEnquiryEmail(email, firstName, courseName) {
    var payload = {
      TriggeredSendDefinition: { CustomerKey: "TSD_Enquiry_Received" },
      Subscribers: [{
        EmailAddress: email,
        SubscriberKey: email.toLowerCase(),
        Attributes: [
          { Name: "FirstName",  Value: firstName || "there" },
          { Name: "CourseName", Value: courseName || "your chosen course" }
        ]
      }]
    };
    var res = api.createItem("TriggeredSend", payload);
    if (res.Status !== "OK") {           /* one retry for transient errors */
      res = api.createItem("TriggeredSend", payload);
    }
    return res;
  }

  try {
    var r = sendEnquiryEmail(
      Request.GetFormField("email"),
      Request.GetFormField("firstName"),
      Request.GetFormField("courseName")
    );
    DataExtension.Init("Send_Log").Rows.Add({
      SubscriberKey: String(Request.GetFormField("email")).toLowerCase(),
      Status: r.Status,
      Message: String(r.Results && r.Results[0] ? r.Results[0].StatusMessage : "").substring(0, 500),
      LoggedAt: Platform.Function.Now()
    });
  } catch (e) {
    Write("<!-- send failed -->");
  }
</script>
