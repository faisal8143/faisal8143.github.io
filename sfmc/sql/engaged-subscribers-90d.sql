/*
  ==========================================================================
  NORTHWIND LEARNING | ENGAGEMENT SCORING QUERY
  Author: Faisal Irfan | github.com/faisal8143
  ==========================================================================
  Automation Studio query: engagement score for the last 90 days
  Target DE: Engagement_Score_90d (Overwrite)
  Primary key: SubscriberKey

  Score = opens x 1 + clicks x 3, excluding bounced/unsubscribed subscribers.
  Uses system data views (_Open, _Click, _Bounce, _Subscribers).
*/

SELECT
    s.SubscriberKey,
    s.EmailAddress,
    ISNULL(o.Opens, 0)                                   AS Opens90d,
    ISNULL(c.Clicks, 0)                                  AS Clicks90d,
    ISNULL(o.Opens, 0) * 1 + ISNULL(c.Clicks, 0) * 3     AS EngagementScore,
    CASE
        WHEN ISNULL(c.Clicks, 0) >= 3                    THEN 'Hot'
        WHEN ISNULL(o.Opens, 0) >= 2 OR c.Clicks >= 1    THEN 'Warm'
        ELSE 'Cold'
    END                                                  AS Segment,
    GETDATE()                                            AS CalculatedAt
FROM _Subscribers s
LEFT JOIN (
    SELECT SubscriberKey, COUNT(DISTINCT JobID) AS Opens
    FROM _Open
    WHERE EventDate >= DATEADD(DAY, -90, GETDATE())
      AND IsUnique = 1
    GROUP BY SubscriberKey
) o ON o.SubscriberKey = s.SubscriberKey
LEFT JOIN (
    SELECT SubscriberKey, COUNT(DISTINCT JobID) AS Clicks
    FROM _Click
    WHERE EventDate >= DATEADD(DAY, -90, GETDATE())
      AND IsUnique = 1
    GROUP BY SubscriberKey
) c ON c.SubscriberKey = s.SubscriberKey
WHERE s.Status = 'active'
  AND NOT EXISTS (
      SELECT 1
      FROM _Bounce b
      WHERE b.SubscriberKey = s.SubscriberKey
        AND b.BounceCategory = 'Hard bounce'
        AND b.EventDate >= DATEADD(DAY, -90, GETDATE())
  )
