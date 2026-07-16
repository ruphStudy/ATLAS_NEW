# ATLAS – AI Commerce Operating System

# 04_User_Flow.md

---

Document ID: UF-001

Version: 1.0

Status: APPROVED

Project: ATLAS – AI Commerce Operating System

Owner: CEO

Technical Owner: CTO

Last Updated: July 2026

---

# 1. Purpose

This document defines every user interaction within ATLAS Version 1.

It explains how users move through the platform, which modules participate, where AI is invoked, and where human approval is required.

Every future screen, API, AI Agent and background job must follow these flows.

---

# 2. User Types

## Primary User

Amazon FBA Seller

---

## Future Users

- Team Member
- Business Manager
- Agency
- Enterprise Admin

---

# 3. Primary Journey

```text
Register
      │
      ▼
Login
      │
      ▼
Create Workspace
      │
      ▼
Connect Amazon Seller Account
      │
      ▼
Configure Business
      │
      ▼
Discover Products
      │
      ▼
Verify Suppliers
      │
      ▼
Purchase Inventory
      │
      ▼
Ship to Amazon FBA
      │
      ▼
Generate Listing
      │
      ▼
Review & Approve
      │
      ▼
Publish
      │
      ▼
Receive Orders
      │
      ▼
Track Business
      │
      ▼
Continuous AI Optimization
```

---

# 4. Flow 01 — User Registration

Flow ID

UF-001

## Trigger

New user visits ATLAS.

## Flow

```text
Landing Page

↓

Register

↓

Email Verification

↓

Create Password

↓

Create Workspace

↓

Dashboard
```

## APIs

- POST /auth/register
- POST /auth/verify-email
- POST /workspace

## AI Used

No

## Background Jobs

- Send verification email

---

# 5. Flow 02 — Login

Flow ID

UF-002

```text
Login

↓

JWT Authentication

↓

Load Workspace

↓

Dashboard
```

APIs

- POST /auth/login

AI

No

---

# 6. Flow 03 — Business Setup

Flow ID

UF-003

```text
Dashboard

↓

Connect Amazon

↓

Marketplace

↓

Budget

↓

Business Preferences

↓

Categories

↓

Finish Setup
```

System stores

- Marketplace
- Budget
- Categories
- Business Preferences

APIs

- POST /settings
- POST /amazon/connect

AI

No

---

# 7. Flow 04 — Product Discovery

Flow ID

UF-004

## Trigger

User clicks **Discover Products**

```text
Enter Budget

↓

Select Category

↓

AI Product Research

↓

Demand Analysis

↓

Competition Analysis

↓

Market Dominance

↓

Entry Difficulty

↓

Supplier Availability

↓

Profit Analysis

↓

Opportunity Score

↓

Recommendation List
```

AI Agents

- Product Intelligence
- Pricing Intelligence
- Risk Intelligence

Outputs

- Opportunity Score
- Confidence Score
- Risk Score

Approval

No

---

# 8. Flow 05 — Product Selection

Flow ID

UF-005

```text
Recommendation List

↓

Compare Products

↓

View Details

↓

Choose Product
```

Outputs

Selected Product

---

# 9. Flow 06 — Supplier Intelligence

Flow ID

UF-006

```text
Selected Product

↓

Find Suppliers

↓

GST Verification

↓

Business Verification

↓

Website Analysis

↓

Review Analysis

↓

Trust Score

↓

Risk Score

↓

Supplier Ranking

↓

Recommendation
```

AI Agents

- Supplier Intelligence
- Risk Intelligence

Outputs

- Trust Score
- Recommendation

---

# 10. Flow 07 — Purchase Approval

Flow ID

UF-007

```text
Supplier Selected

↓

Purchase Recommendation

↓

Human Approval

↓

Generate Purchase Order

↓

Supplier Dispatch
```

Business Rule

ATLAS never purchases automatically.

Human approval is mandatory.

---

# 11. Flow 08 — Inventory

Flow ID

UF-008

```text
Supplier Ships

↓

Tracking

↓

Amazon Receives

↓

Inventory Available
```

Background Jobs

Inventory synchronization

---

# 12. Flow 09 — Listing Generation

Flow ID

UF-009

```text
Inventory Ready

↓

Generate Title

↓

Generate Bullets

↓

Generate Description

↓

Generate SEO Keywords

↓

Generate Images

↓

Listing Score

↓

Draft Listing
```

AI Agents

- Listing Intelligence
- SEO Intelligence
- Image Intelligence

Outputs

Draft Listing

---

# 13. Flow 10 — Validation

Flow ID

UF-010

```text
Draft Listing

↓

Validation Engine

↓

Amazon Policy Validation

↓

Business Rules Validation

↓

Pass

↓

Ready For Review
```

If validation fails

```text
Validation

↓

Error

↓

Regenerate

↓

Validate Again
```

---

# 14. Flow 11 — Human Approval

Flow ID

UF-011

```text
Draft

↓

Preview

↓

Approve

↓

Publish
```

Business Rule

Publishing always requires approval.

---

# 15. Flow 12 — Amazon Publishing

Flow ID

UF-012

```text
Approved Listing

↓

Amazon SP API

↓

Published

↓

Sync Status
```

Background Jobs

Listing Synchronization

---

# 16. Flow 13 — Orders

Flow ID

UF-013

```text
Customer Orders

↓

Amazon Sync

↓

Dashboard Update

↓

Profit Update
```

Background Jobs

Order Synchronization

---

# 17. Flow 14 — Inventory Monitoring

Flow ID

UF-014

```text
Inventory

↓

Threshold Check

↓

Low Stock

↓

Restock Prediction

↓

Supplier Recommendation

↓

User Approval
```

AI Agents

- Inventory Intelligence

---

# 18. Flow 15 — Competitor Monitoring

Flow ID

UF-015

```text
Competitor Scan

↓

Price Changes

↓

Review Changes

↓

Ranking Changes

↓

Recommendation
```

Runs automatically.

---

# 19. Flow 16 — Business Intelligence

Flow ID

UF-016

```text
Sales

↓

Orders

↓

Inventory

↓

Reviews

↓

Profit

↓

AI Analysis

↓

Daily Report
```

Outputs

- Business Health
- Recommendations
- Opportunities

---

# 20. Flow 17 — AI Learning

Flow ID

UF-017

```text
Business Data

↓

AI Learning Engine

↓

Improve Future Decisions

↓

Update Knowledge Base
```

Runs in background.

---

# 21. Error Flow

```text
User Action

↓

API

↓

Validation

↓

Success

OR

Failure

↓

Log Error

↓

Retry

↓

Notify User
```

No operation should terminate silently.

---

# 22. Approval Rules

Human approval is mandatory for:

- Supplier Selection
- Purchase Orders
- Inventory Purchase
- Product Publishing
- Business Settings
- API Credential Changes

AI cannot execute these actions independently.

---

# 23. Background Jobs

Scheduled Jobs

- Product Monitoring
- Competitor Monitoring
- Inventory Monitoring
- Report Generation
- AI Learning
- Amazon Synchronization

---

# 24. User Flow Principles

UF-RULE-001

Every flow must have a clear starting point.

---

UF-RULE-002

Every flow must have a successful completion state.

---

UF-RULE-003

Every flow must include error handling.

---

UF-RULE-004

AI recommendations never bypass validation.

---

UF-RULE-005

Financial operations require human approval.

---

UF-RULE-006

Long-running operations execute asynchronously.

---

UF-RULE-007

Every important action is logged.

---

# 25. Acceptance Criteria

This document is complete when:

✔ Every primary business flow is documented.

✔ Every AI interaction is identified.

✔ Human approval points are defined.

✔ Background jobs are identified.

✔ Error handling is documented.

✔ Validation checkpoints are documented.

---

# 26. Version History

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | July 2026 | Initial Approved User Flow |

---

# 27. Approval

CEO Approval

✅ Approved

Technical Approval

✅ Approved

Document Status

🔒 LOCKED

Next Document

05_AI_Agent_Architecture.md