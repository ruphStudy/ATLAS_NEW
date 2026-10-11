# ATLAS Amazon SP-API Security Controls Matrix

| Amazon Requirement | ATLAS Control | Evidence / Reference | Status |
|---|---|---|---|
| Report security incidents involving Amazon Information within 24 hours | Incident Response Policy requires notification to security@amazon.com within 24 hours | incident-response-policy.md | Implemented |
| Defined incident-response roles | Incident Owner, Technical Lead, Security/Compliance Contact defined | incident-response-policy.md | Implemented |
| Incident-response plan reviewed every 6 months | Formal review frequency documented | incident-response-policy.md, policy-review-record.md | Implemented |
| Firewall controls | AWS Security Groups, NACLs, WAF | network-security-controls.md, Terraform | Implemented |
| Network segmentation | Public/private AWS subnets; RDS/Redis restricted to backend | network-security-controls.md, Terraform | Implemented |
| IDS/IPS | AWS GuardDuty threat detection plus ECS Fargate Runtime Monitoring | AWS GuardDuty detector and runtime monitoring configuration | Implemented |
| Anti-virus / anti-malware | AWS GuardDuty Malware Protection and runtime monitoring enabled for supported workloads/resources | network-security-controls.md, AWS configuration | Implemented |
| Security monitoring | GuardDuty, CloudTrail, CloudWatch, VPC Flow Logs | network-security-controls.md | Implemented |
| Password minimum 12 characters | Defined in Access and Password Policy | access-password-policy.md | Policy defined |
| Special characters required | Defined in Access and Password Policy | access-password-policy.md | Policy defined |
| MFA | AWS IAM Identity Center enforces MFA on every sign-in for workforce/admin access; member-account root credentials are centrally removed/not present | IAM Identity Center authentication settings; IAM Root access management | Implemented |
| Password expiration within 365 days | ATLAS enforces a maximum password age of 365 days and blocks authentication when the password is expired | backend/src/modules/authentication/constants/auth.constants.ts; backend/src/modules/authentication/authentication.service.ts | Implemented |
| Annual password rotation | ATLAS forces password change after the 365-day maximum age and resets passwordChangedAt when the password is changed | backend/src/modules/authentication/authentication.service.ts; backend/src/modules/authentication/authentication.repository.ts | Implemented |
| Secrets not stored in source code | Secrets must be stored in approved secret-management systems | access-password-policy.md | Policy defined |
| SP-API secrets stored securely | AWS Secrets Manager used for staging secrets | AWS configuration | Implemented |