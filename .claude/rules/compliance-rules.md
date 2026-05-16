# Compliance Rules

GDPR and ISO 27001 requirements for projects at Techversant Infotech. These rules are checked by the `security-reviewer` agent and apply to any feature that handles personal data or operates under a compliance obligation.

---

## Applicability

Apply these rules when the project:
- Processes personal data of EU/UK residents (GDPR)
- Operates under ISO 27001 certification or is working toward it
- Handles health, financial, or other sensitive regulated data

Mark `GDPR, ISO27001` in CLAUDE.md with applicable frameworks: `GDPR`, `ISO27001`, `HIPAA`, `SOC2`, `PCI-DSS`, or `N/A`.

---

## GDPR Requirements

### Lawful Basis
- [ ] Every data processing activity has a documented lawful basis (consent, contract, legal obligation, legitimate interest)
- [ ] Lawful basis is recorded in the data processing register
- [ ] Where consent is the basis: it is freely given, specific, informed, and unambiguous
- [ ] Consent records include timestamp, mechanism, and version of privacy notice shown

### Data Minimisation
- [ ] Only data strictly necessary for the stated purpose is collected
- [ ] Optional fields are clearly marked as optional
- [ ] No data collected "just in case" — every field has a documented purpose
- [ ] No sensitive special-category data (health, ethnicity, biometrics, etc.) collected unless explicitly required and documented

### Data Subject Rights
- [ ] Right to access: users can export their personal data in a machine-readable format
- [ ] Right to erasure: users can delete their account and associated personal data
- [ ] Right to rectification: users can correct inaccurate personal data
- [ ] Right to portability: data export available in JSON or CSV
- [ ] Rights requests can be fulfilled within 30 days
- [ ] Erasure triggers a soft delete + anonymisation pipeline, not just a `deleted_at` flag

### Data Retention
- [ ] Retention periods defined for each data category
- [ ] Automated purge or anonymisation runs at retention expiry
- [ ] Retention periods documented in the data processing register
- [ ] Backups subject to the same retention rules

### Privacy by Design
- [ ] Privacy impact assessed before implementing any new personal data processing
- [ ] PII encrypted at rest and in transit
- [ ] PII never logged — mask or omit in structured logs
- [ ] PII never in URLs (path params, query strings)
- [ ] PII access restricted to roles with a documented need

### Third-Party Processors
- [ ] Data Processing Agreements (DPAs) signed with all third parties that process personal data
- [ ] Third-party processors listed and reviewed annually
- [ ] No personal data sent to a third party without a DPA

### Breach Response
- [ ] Data breach detection and notification process documented
- [ ] Supervisory authority notification within 72 hours of breach discovery (if required)
- [ ] Data subject notification process defined

---

## ISO 27001 Requirements

### Access Control
- [ ] Principle of least privilege applied — users and services have minimum required permissions
- [ ] Privileged access (admin, DB, infra) requires MFA
- [ ] Access rights reviewed quarterly and on role change
- [ ] Offboarding process revokes all access within 24 hours

### Asset Management
- [ ] Data assets classified: Public / Internal / Confidential / Restricted
- [ ] Data classification applied to all stored and transmitted data
- [ ] Asset register maintained for production systems

### Cryptography
- [ ] Data classified as Confidential or Restricted is encrypted at rest (AES-256 or equivalent)
- [ ] All data in transit uses TLS 1.2 minimum (TLS 1.3 preferred)
- [ ] Encryption keys managed via a key management service — not hardcoded
- [ ] Key rotation policy defined and enforced

### Logging and Monitoring
- [ ] All authentication events logged (success + failure)
- [ ] All authorisation failures logged
- [ ] All administrative actions logged with actor, action, timestamp
- [ ] Logs retained for minimum 12 months
- [ ] Alerting configured for anomalous access patterns

### Vulnerability Management
- [ ] Dependency audit runs in CI: no HIGH or CRITICAL CVEs unresolved
- [ ] Security patches applied within defined SLA (CRITICAL: 24h, HIGH: 7 days, MEDIUM: 30 days)
- [ ] Penetration test conducted before major releases or annually

### Incident Management
- [ ] Security incident classification defined (P1–P4)
- [ ] Incident response playbook documented
- [ ] Post-incident review conducted for all P1/P2 incidents

### Supplier Security
- [ ] Security requirements included in supplier contracts
- [ ] Third-party integrations reviewed for security posture annually

---

## Review Checklist for security-reviewer

When performing a compliance review, check:

```
GDPR:
[ ] Lawful basis documented for all new data processing
[ ] No new PII fields without documented purpose
[ ] Data subject rights implementable for new data types
[ ] No PII in logs, URLs, or error messages
[ ] DPAs in place for any new third-party processors

ISO 27001:
[ ] Access controls follow least privilege
[ ] New data classified and protected accordingly
[ ] All new audit-relevant actions are logged
[ ] No new HIGH/CRITICAL CVEs introduced
[ ] Encryption applied where required by classification
```

---

## Severity for Compliance Violations

| Violation | Severity |
|---|---|
| PII in logs or URLs | CRITICAL — immediate fix |
| No lawful basis for data processing | CRITICAL — feature blocked |
| Missing DPA for third-party processor | HIGH |
| Data retained beyond defined period | HIGH |
| Missing encryption for Confidential data | HIGH |
| No data subject rights implementation | HIGH |
| Missing audit log for admin action | MEDIUM |
| Dependency with known CVE | HIGH (CRITICAL if CVSS ≥ 9) |
