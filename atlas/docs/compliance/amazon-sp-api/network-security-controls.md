# ATLAS Network Security Controls

## 1. Firewall Controls
ATLAS uses AWS Security Groups and Network ACLs to restrict inbound and outbound network traffic.

## 2. Network Segmentation
ATLAS separates public-facing and private resources using dedicated public and private subnets within the AWS VPC.

Private services such as PostgreSQL and Redis are not publicly accessible and are reachable only from authorized application resources.

## 3. Web Application Protection
Internet-facing traffic is protected using AWS Web Application Firewall (WAF) and an Application Load Balancer (ALB).

## 4. Threat Detection
AWS GuardDuty is enabled to monitor AWS activity for suspicious behavior and potential threats.

## 5. Malware Protection
AWS GuardDuty Malware Protection is enabled for supported workloads/resources.

## 6. Logging and Monitoring
AWS CloudTrail, CloudWatch, and VPC Flow Logs are used for security monitoring, investigation, and audit purposes.

## 7. Encryption
Sensitive data is protected using encryption in transit and at rest where supported, including database and Redis services.

## 8. Access Restrictions
Database and Redis security groups allow access only from approved backend application resources and are not exposed directly to the public internet.