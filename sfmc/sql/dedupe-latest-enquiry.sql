/*
  ==========================================================================
  NORTHWIND LEARNING | DEDUPLICATE ENQUIRIES (LATEST PER SUBSCRIBER)
  Author: Faisal Irfan | github.com/faisal8143
  ==========================================================================
  Automation Studio query. Source: Course_Enquiries_Raw (all form fills)
  Target: Course_Enquiries (Overwrite, PK SubscriberKey)

  Keeps only each subscriber's most recent enquiry, normalises email case,
  and drops rows without a valid-looking email address.
*/

SELECT
    LOWER(LTRIM(RTRIM(e.EmailAddress)))  AS SubscriberKey,
    LOWER(LTRIM(RTRIM(e.EmailAddress)))  AS EmailAddress,
    e.FirstName,
    e.CourseCode,
    e.CourseName,
    e.OptIn,
    e.EnquiryDate
FROM (
    SELECT
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(LTRIM(RTRIM(r.EmailAddress)))
            ORDER BY r.EnquiryDate DESC
        ) AS rn
    FROM Course_Enquiries_Raw r
    WHERE r.EmailAddress LIKE '%_@_%._%'
) e
WHERE e.rn = 1
