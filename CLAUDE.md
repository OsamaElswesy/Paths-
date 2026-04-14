# PATHS Project - Claude Code Working Context

## Project Name
PATHS - Personalized AI Talent Hiring System

## Main Goal
PATHS is an AI-driven hiring platform that supports sourcing, candidate profile building, evaluation, outreach, scheduling, interview support, decision support, and post-evaluation feedback in one unified workflow.

## Current Tech Stack
### Backend
- Framework: FastAPI
- Language: Python
- Responsibility: API layer, business logic, AI/agent orchestration, integrations, workflow execution, scoring/evaluation pipelines, scheduling logic, persistence connectors, and audit-related logic

### Frontend
- Framework: Next.js
- Language: TypeScript / JavaScript
- Responsibility: recruiter dashboard, workflow UI, candidate views, jobs pages, sourcing pages, screening results, scheduling pages, decision support pages, reports, and human-in-the-loop approval interfaces

## Current Objective In This Phase
The current priority is NOT broad feature expansion.
The current priority is:

1. understand the current project state
2. audit the backend implementation
3. audit the frontend implementation
4. identify which agents already exist in code
5. identify what is complete, partial, missing, duplicated, or weak
6. restructure the project understanding before implementing major changes

## What Claude Must Do First
Before proposing large changes:
- inspect the current repository structure
- identify backend modules
- identify frontend modules
- detect current agent-related files, prompts, services, workflows, or orchestration logic
- summarize what has already been implemented
- separate confirmed implementation from assumptions

Do NOT assume the documented architecture is fully implemented in code.
Always verify against actual files.

## Audit Goals
Claude should help answer the following:
- What has already been built in backend?
- What has already been built in frontend?
- Which agents are already implemented?
- Which agents are only partially implemented?
- Which documented features are missing from code?
- Which modules need refactoring?
- What is the safest next implementation order?

## Important Known Context
The graduation project document describes a modular multi-agent recruitment system including sourcing, scoring/ranking, contact enrichment, outreach, scheduling, technical interview, technical assessment, HR interview, and decision support.

However, the actual repository may differ from the document.
Code truth has priority over document assumptions.

## This Phase Scope
### New agents planned later
- Evidence Validation Agent
- Bias & Fairness Audit Agent
- Learning Feedback Agent
- Interview Quality Control Agent

### Existing agents/modules to inspect and improve
- Scoring / Ranking
- Outreach
- Scheduling
- Decision Support

## Engineering Principles
- prefer code truth over documentation assumptions
- prefer minimal diffs
- do not refactor unrelated modules
- preserve working code
- explain findings before major edits
- separate auditing from implementation
- keep suggestions practical and incremental

## Output Rules
When reviewing code, always return:

### For repository understanding
- backend structure summary
- frontend structure summary
- detected agent-related modules
- unclear areas needing deeper inspection

### For audits
- what is already implemented
- what is partially implemented
- what is missing
- critical issues
- medium issues
- quick wins
- recommended next step

### For implementation plans
- goal
- exact files to create or update
- why these files
- risks
- verification steps

## Token Efficiency Rules
- do not scan the whole repository repeatedly
- inspect only relevant folders for the current task
- skip node_modules, .next, dist, build, cache, lockfiles, generated files, binaries, and assets unless needed
- summarize before editing
- do not repeat project context already written here
- work module by module
- keep responses concise and action-oriented

## Important Constraints
- never allow fully automated rejection without human review
- separate evidence from inference
- surface missing data clearly
- preserve explainability
- preserve auditability
- preserve human-in-the-loop checkpoints

## Definition of Done For Current Audit Phase
This phase is complete only when Claude can clearly state:
- backend modules and their responsibilities
- frontend modules and their responsibilities
- implemented agents and their locations
- missing agents/features
- current technical risks
- recommended implementation order