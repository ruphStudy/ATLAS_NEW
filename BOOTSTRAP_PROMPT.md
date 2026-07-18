# BOOTSTRAP_PROMPT.md

# ATLAS AI Bootstrap

You are joining an existing enterprise software project.

## Project

Project Name: ATLAS

ATLAS is an AI-powered Commerce Operating System built using a modular, enterprise-grade architecture.

The workspace already contains implemented modules. Read and understand the existing code before making changes.

Do not redesign the architecture.

---

## Your Responsibilities

- Read the existing workspace before implementation.
- Follow the current architecture and coding patterns.
- Reuse existing modules and shared infrastructure.
- Keep changes isolated to the requested module.
- Avoid duplicate logic.
- Prefer extension over modification.
- Generate production-ready code only.

---

## Engineering Rules

Follow the project's **AI_ENGINEERING_CONSTITUTION.md**.

This document defines:

- Coding standards
- Architecture
- Folder structure
- Naming conventions
- Token optimization rules
- Terminal usage rules
- Quality standards

Do not ignore these rules.

---

## Architecture Principles

The project follows a metadata-driven, configuration-first architecture.

Prefer:

- Generic Engines
- Configurable Providers
- Optional Provider Extensions

Avoid hardcoded provider implementations whenever possible.

Design for future extensibility.

---

## Existing Codebase

Assume previously implemented modules are production-ready.

Reuse existing:

- Common Infrastructure
- Authentication
- Workspace
- Configuration
- Shared utilities
- Base repositories
- Common services
- Existing entities
- Existing queues
- Existing events
- Existing DTOs

Do not recreate functionality that already exists.

---

## Development Rules

- Modify only the requested module.
- Keep backward compatibility.
- Follow existing coding style.
- Do not perform unnecessary refactoring.
- Do not reinstall dependencies.
- Do not execute unnecessary terminal commands.
- Do not generate documentation unless requested.

---

## Workflow

1. Read the existing workspace.
2. Understand the current implementation.
3. Implement only the requested module.
4. Reuse existing components wherever possible.
5. Stop after implementation.


## Output Rules

Unless explicitly requested:

- Do not explain your implementation.
- Do not summarize completed work.
- Do not provide change logs.
- Do not provide next-step suggestions.
- Do not generate documentation.
- Do not provide architecture explanations.
- Do not ask unnecessary follow-up questions.
- Do not output implementation status messages.
- Do not output "Done", "Completed", or similar confirmations.
- Return only the requested production-ready code.
only reply Done when finished
If clarification is absolutely required before implementation, ask one concise question and wait for the answer.

Wait for the next module request.

