# MVP 8: Trusted Beta Readiness

## Outcome

The service can safely admit cohorts of 10, 25, then 100 trusted adults with a
tested recovery path and observable moderation workload.

## Work packages

1. Production images and deterministic container startup.
2. Caddy TLS termination and non-public worker isolation.
3. S3 media and encrypted backup configuration.
4. Automated database backup with retention.
5. Independent clean-host restore drill; backup creation is not proof.
6. Metrics, dashboards, alerts, and external uptime checks.
7. User data export.
8. Account deletion, active-media purge, cache purge, and federation propagation.
9. Consent records, privacy notice, terms, and incident contact.
10. Web manifest and installability.
11. Offline application shell without misleading offline mutations.
12. Web push notifications with revocation.
13. Complete pt-BR catalog and English fallback.
14. Keyboard, screen-reader, and WCAG 2.2 AA audit of core journeys.
15. Security suite for XSS, SSRF, uploads, auth abuse, signatures, and roles.
16. Load and queue-recovery test at the documented beta target.
17. Moderation and incident-response drill.
18. Ten-user cohort gate and retrospective.
19. Twenty-five-user cohort gate and retrospective.
20. Hundred-user cohort gate and retrospective.

## Cohort gate

Each expansion requires healthy service and queue metrics, successful recent
restore evidence, bounded unresolved moderation cases, completed deletion and
export requests, and no open critical security finding. Expansion pauses when
any gate fails.
