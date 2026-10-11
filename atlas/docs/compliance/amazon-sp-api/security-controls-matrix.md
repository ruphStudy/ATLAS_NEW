# ATLAS Amazon SP-API Security Controls Matrix

| Amazon Requirement | ATLAS Control | Evidence / Reference | Status |
|---|---|---|---|
| Report security incidents involving Amazon Information within 24 hours | Incident Response Policy requires notification to security@amazon.com within 24 hours | incident-response-policy.md | Implemented |
| Defined incident-response roles | Incident Owner, Technical Lead, Security/Compliance Contact defined | incident-response-policy.md | Implemented |
| Incident-response plan reviewed every 6 months | Formal review frequency documented | incident-response-policy.md, policy-review-record.md | Implemented |
| Firewall controls | AWS Security Groups, NACLs, WAF | network-security-controls.md, Terraform | Implemented |
| Network segmentation | Public/private AWS subnets; RDS/Redis restricted to backend | network-security-controls.md, Terraform | Implemented |
| IDS/IPS | To be verified against current AWS implementation and Amazon requirement | Pending verification | Pending |
| Anti-virus / anti-malware | AWS GuardDuty Malware Protection enabled for supported resources | network-security-controls.md, AWS configuration | Implemented / verify coverage |
| Security monitoring | GuardDuty, CloudTrail, CloudWatch, VPC Flow Logs | network-security-controls.md | Implemented |
| Password minimum 12 characters | Defined in Access and Password Policy | access-password-policy.md | Policy defined |
| Special characters required | Defined in Access and Password Policy | access-password-policy.md | Policy defined |
| MFA | Required for privileged/admin accounts where supported | access-password-policy.md | Policy defined / verify accounts |
| Password expiration within 365 days | Defined in Access and Password Policy | access-password-policy.md | Policy defined |
| Annual credential rotation | Defined in Access and Password Policy | access-password-policy.md | Policy defined |
| Secrets not stored in source code | Secrets must be stored in approved secret-management systems | access-password-policy.md | Policy defined |
| SP-API secrets stored securely | AWS Secrets Manager used for staging secrets | AWS configuration | Implemented |