# ATLAS Access and Password Policy

## 1. Purpose
This policy defines authentication and access-control requirements for systems used to operate and administer the ATLAS platform.

## 2. Password Requirements
Where password-based authentication is used:

- Passwords must contain at least 12 characters.
- Passwords must include special characters.
- Passwords must not be shared between users.
- Default or temporary passwords must be changed immediately.
- Passwords must expire within a maximum of 365 days.
- Credentials must be reviewed and rotated at least annually.

## 3. Multi-Factor Authentication
Multi-Factor Authentication (MFA) is required for privileged and administrative accounts wherever supported.

This includes administrative access to infrastructure, source-code repositories, Amazon developer services, and other systems containing sensitive information.

## 4. Individual Accounts
Administrative access must use individually assigned accounts. Shared administrative accounts are prohibited unless technically unavoidable and separately controlled.

## 5. Least Privilege
Users and services must receive only the permissions required to perform their assigned functions.

## 6. Access Review
Privileged access must be reviewed periodically and removed when it is no longer required.

## 7. Account Termination
Access must be revoked promptly when an individual leaves the organization or no longer requires access.

## 8. Credential Protection
Passwords, API secrets, tokens, and other credentials must not be stored in source code or publicly accessible repositories.

Production and staging secrets must be stored using approved secret-management systems such as AWS Secrets Manager.