/*
  ==========================================================================
  NORTHWIND LEARNING | SUBSCRIBER ATTRIBUTES + SUPPRESSION BUILD
  Author: Faisal Irfan | github.com/faisal8143
  ==========================================================================
  Automation Studio query. Builds the sendable audience for a campaign by
  combining subscriber attributes with every suppression rule in one pass.

  Source      Course_Enquiries, Student_Status, Subscriber_Preferences,
              Suppression_Manual, _Subscribers, _Bounce, _Unsubscribe, _Sent
  Target      Campaign_Audience (Overwrite)
  Primary key SubscriberKey

  Why one query rather than a chain of filters: a filter chain hides WHY a
  subscriber was dropped. This keeps the reason on the row, so the count can
  be explained to a client without re-running anything.
*/

WITH latest_enquiry AS (
    /* One row per subscriber: the most recent enquiry only */
    SELECT
        SubscriberKey,
        CourseCode,
        CourseName,
        Fee,
        EnquiryDate
    FROM (
        SELECT
            e.*,
            ROW_NUMBER() OVER (PARTITION BY e.SubscriberKey
                               ORDER BY e.EnquiryDate DESC) AS rn
        FROM Course_Enquiries e
        WHERE e.EmailAddress LIKE '%_@_%._%'
    ) ranked
    WHERE rn = 1
),

fatigue AS (
    /* Anyone who already received 3+ sends in the last 7 days */
    SELECT SubscriberKey, COUNT(*) AS Sends7d
    FROM _Sent
    WHERE EventDate >= DATEADD(DAY, -7, GETDATE())
    GROUP BY SubscriberKey
    HAVING COUNT(*) >= 3
),

suppression AS (
    /* Every reason to exclude someone, unioned, with the reason kept */
    SELECT SubscriberKey, 'Hard bounce'        AS Reason
    FROM _Bounce
    WHERE BounceCategory = 'Hard bounce'
      AND EventDate >= DATEADD(DAY, -180, GETDATE())

    UNION
    SELECT SubscriberKey, 'Unsubscribed'
    FROM _Unsubscribe

    UNION
    SELECT SubscriberKey, 'Opted out of this topic'
    FROM Subscriber_Preferences
    WHERE News = 'false'

    UNION
    SELECT SubscriberKey, 'Manual suppression'
    FROM Suppression_Manual

    UNION
    SELECT SubscriberKey, 'Send fatigue'
    FROM fatigue
)

SELECT
    s.SubscriberKey,
    s.EmailAddress,

    /* Attributes the email personalises on */
    le.CourseCode,
    le.CourseName,
    le.Fee,
    le.EnquiryDate,
    ISNULL(st.EngagementScore, 0)                        AS EngagementScore,
    ISNULL(st.IsReturning, 'false')                      AS IsReturning,

    CASE
        WHEN ISNULL(st.EngagementScore, 0) >= 40 THEN 'Hot'
        WHEN ISNULL(st.EngagementScore, 0) >= 20 THEN 'Warm'
        ELSE 'Cold'
    END                                                  AS Segment,

    /* A subscriber with no enquiry row still gets the generic version */
    CASE WHEN le.SubscriberKey IS NULL THEN 'false' ELSE 'true' END AS HasEnquiry,

    GETDATE()                                            AS BuiltAt

FROM _Subscribers s
LEFT JOIN latest_enquiry le ON le.SubscriberKey = s.SubscriberKey
LEFT JOIN Student_Status   st ON st.SubscriberKey = s.SubscriberKey
WHERE s.Status = 'active'
  AND NOT EXISTS (SELECT 1 FROM suppression x WHERE x.SubscriberKey = s.SubscriberKey)

/*
  --------------------------------------------------------------------------
  Companion query, same sources, target Campaign_Suppressed (Overwrite).
  Run it alongside the build so the dropped count is always explainable:

    SELECT x.SubscriberKey, x.Reason, GETDATE() AS BuiltAt
    FROM suppression x
    INNER JOIN _Subscribers s ON s.SubscriberKey = x.SubscriberKey

  "Why is the audience 4,000 lower than last month" then takes one query,
  not an afternoon.
  --------------------------------------------------------------------------
*/
