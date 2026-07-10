# Security Policy

## Reporting a Vulnerability

**Do not** file public issues, pull requests, or social media posts about suspected security vulnerabilities. Disclose them privately so we can investigate and fix before details are public.

### How to report

Email: **lajinmj@gmail.com**

Include:
- A description of the issue and where it lives (file path, endpoint, screen)
- Steps to reproduce, ideally as a minimal proof-of-concept
- Suspected impact (data exposure, account takeover, privilege escalation, denial of service, etc.)
- Whether this is exploitable and how
- Your contact details for follow-up

If you believe the issue requires encrypted communication, mention it in the email and we'll provide a PGP key.

### What to expect

| Step | Timeline |
|---|---|
| Acknowledgement of receipt | Within 2 business days |
| Initial severity assessment | Within 5 business days |
| Patch and release for CRITICAL issues | Within 7 days of confirmation |
| Patch and release for HIGH issues | Within 30 days of confirmation |
| Patch and release for MEDIUM/LOW | Next regular release cycle |

We will keep you informed of progress and credit you in the release notes (with your permission) once the issue is resolved.

---

## Scope

In scope:
- The application code in `apps/` and `packages/`
- Infrastructure-as-code in `infra/`
- CI/CD workflows in `.github/workflows/`
- Build, packaging, and supply-chain concerns

Out of scope:
- Issues in third-party dependencies — please report those upstream and notify us so we can update
- Theoretical vulnerabilities without a proof-of-concept
- Issues in non-production environments not exposed to users
- Self-XSS, social engineering, denial-of-service via volumetric attacks

---

## Compliance

This project's compliance scope is declared in [CLAUDE.md](./CLAUDE.md) (`COMPLIANCE_SCOPE`). Reports of issues affecting compliance posture (GDPR, ISO 27001, HIPAA, SOC 2, PCI-DSS) are prioritised.

For full compliance rules: [.claude/rules/compliance-rules.md](./.claude/rules/compliance-rules.md).

---

## Safe Harbour

We will not pursue legal action against researchers who:
- Make a good-faith effort to follow this policy
- Avoid privacy violations, destruction of data, and disruption of services
- Give us reasonable time to investigate and patch before public disclosure
- Do not exploit the issue beyond what is necessary to demonstrate it

---

## Responsible Disclosure

We follow [coordinated disclosure](https://www.first.org/global/sigs/vulnerability-coordination/multiparty/guidelines-v1.1) principles. Public disclosure should occur only after we have:
- Acknowledged the issue
- Released a patch (or accepted the risk explicitly)
- Notified affected customers, where applicable

A 90-day disclosure window from confirmation is standard, with extensions negotiated for complex issues.
