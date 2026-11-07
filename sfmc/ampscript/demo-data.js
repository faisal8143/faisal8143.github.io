/*
  Demo subscribers and Data Extension rows for dynamic-demo.html.
  Author: Faisal Irfan | github.com/faisal8143
  Fictional brand and fictional people.
*/
window.DEMO = (function () {
  var TODAY = new Date();
  /* End of day: a deadline falls at the close of business, so DateDiff from
     "now" returns the whole number of days a subscriber actually has left. */
  function plusDays(n) {
    var d = new Date(TODAY.getTime()); d.setDate(d.getDate() + n); d.setHours(23, 59, 0, 0); return d;
  }
  function minusDays(n) { return plusDays(-n); }

  return {
    today: TODAY,
    /* Term_Config is shared: one current term for everyone, but each
       subscriber below overrides CloseDate to show the urgency tiers. */
    termName: 'Term 1, 2027',

    subscribers: [
      {
        key: 'priya.mehta@example.com',
        attributes: { FirstName: 'priya', LastName: 'Mehta', EmailAddress: 'priya.mehta@example.com' },
        closeDate: plusDays(5),
        data: {
          Course_Enquiries: [
            { SubscriberKey: 'priya.mehta@example.com', CourseName: 'Diploma of Business',
              CourseCode: 'DIPBUS', Fee: 2480, EnquiryDate: minusDays(3) },
            { SubscriberKey: 'priya.mehta@example.com', CourseName: 'Certificate IV in Marketing',
              CourseCode: 'CERT4MKT', Fee: 1890, EnquiryDate: minusDays(41) }
          ],
          Student_Status: [
            { SubscriberKey: 'priya.mehta@example.com', IsReturning: 'true', EngagementScore: 55 }
          ]
        }
      },
      {
        key: 't.whitfield@example.com',
        /* FirstName deliberately blank: the fallback has to catch it */
        attributes: { FirstName: '', LastName: 'Whitfield', EmailAddress: 't.whitfield@example.com' },
        closeDate: plusDays(22),
        data: {
          Course_Enquiries: [
            { SubscriberKey: 't.whitfield@example.com', CourseName: 'Bachelor of Information Technology',
              CourseCode: 'BITCS', Fee: 4150, EnquiryDate: minusDays(9) }
          ],
          Student_Status: [
            { SubscriberKey: 't.whitfield@example.com', IsReturning: 'false', EngagementScore: 25 }
          ]
        }
      },
      {
        key: 'mei.chen@example.com',
        attributes: { FirstName: 'MEI', LastName: 'Chen', EmailAddress: 'mei.chen@example.com' },
        closeDate: plusDays(96),
        data: {
          Course_Enquiries: [
            { SubscriberKey: 'mei.chen@example.com', CourseName: 'Graduate Certificate in Data Analytics',
              CourseCode: 'GCDATA', Fee: 3320, EnquiryDate: minusDays(60) }
          ],
          Student_Status: [
            { SubscriberKey: 'mei.chen@example.com', IsReturning: 'false', EngagementScore: 10 }
          ]
        }
      },
      {
        key: 'jordan.blake@example.com',
        attributes: { FirstName: 'Jordan', LastName: 'Blake', EmailAddress: 'jordan.blake@example.com' },
        closeDate: plusDays(22),
        /* No Course_Enquiries row and no Student_Status row: every fallback fires */
        data: { Course_Enquiries: [], Student_Status: [] }
      }
    ]
  };
})();
