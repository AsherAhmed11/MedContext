MEDCONTEXT
AI-ASSISTED DEVELOPMENT DELEGATION PLAN
CORE PRINCIPLE

AI can propose, implement and accelerate.

The developer must understand, decide, validate and take responsibility.

Main roles:

HUMAN

Product owner
System architect
Critical thinker
Security reviewer
Final decision maker

AI

Implementation accelerator
Research assistant
Test generator
Debugging assistant
Documentation assistant

COLLABORATION

Complex architecture
Security
Safety
Context Engine
Medication safety
Complex debugging
Performance
RESPONSIBILITY SPLIT

Approximate project-wide distribution:

Human:
30%

AI-assisted:
50%

Collaboration:
20%

This refers to engineering effort, NOT lines of code.

Critical systems should have a much higher human contribution.

HUMAN-OWNED WORK

The developer owns:

Problem definition
User personas
Requirements
Acceptance criteria
Product decisions
Architecture
Database concepts
Security model
Authorization
Consent model
Emergency access rules
Context prioritization
Safety constraints
Testing strategy
Technology tradeoffs
Final code review
Final deployment decisions
AI-OWNED / AI-ASSISTED WORK

AI can handle:

CRUD implementation
React components
Forms
Basic API routes
Controllers
Services
Mongoose schemas
TypeScript interfaces
Validation boilerplate
Test scaffolding
Mock data
Seed scripts
Documentation drafts
Docker configuration
CI configuration
Refactoring suggestions
Basic debugging assistance
COLLABORATIVE WORK

Human + AI work together on:

System architecture
Authentication
Authorization
Context Engine
Medication safety
Consent
Emergency access
Audit logging
AI integration
Security threat modeling
Performance optimization
Complex bugs
Test coverage
Scalability
FEATURE DELEGATION

PATIENT PROFILE

Human:

Define fields
Define privacy requirements
Define permissions

AI:

Implement schema
API
React forms
Validation
Tests

Collaboration:

Review authorization
Review sensitive fields

ALLERGY MANAGEMENT

Human:

Define severity
Define verification
Define visibility
Define safety priority

AI:

Schema
API
UI
Tests

Collaboration:

Edge cases
Conflicting data
Historical allergies
Unknown severity

MEDICATION MANAGEMENT

Human:

Define medication model
Define status
Define safety rules

AI:

CRUD
UI
Validation
Tests

Collaboration:

Medication interaction logic
Allergy comparison
Conflicting medication records

CONTEXT ENGINE

Human:

Define priority model
Define relevance rules
Define safety override
Define explanation behavior

AI:

Implementation
Unit tests
Optimization suggestions

Collaboration:

Edge cases
Ranking behavior
Performance
Validation

This is one of the most important human-owned components.

AUTHENTICATION

Human:

Select authentication strategy
Define session/token behavior
Define security requirements

AI:

Middleware
Token handling
Validation
Tests

Collaboration:

Token security
Attack scenarios
Failure handling

AUTHORIZATION

Human:

Define who can access what
Define organization boundaries
Define consent requirements
Define emergency access

AI:

Middleware
Permission helpers
Tests

Collaboration:

Security review
Privilege escalation scenarios
Authorization bypass testing

CONSENT

Human:

Define consent lifecycle
Expiration
Revocation
Access rules

AI:

Schema
APIs
UI
Tests

Collaboration:

Race conditions
Expired consent
Revocation behavior

EMERGENCY ACCESS

Human:

Define emergency conditions
Define required reason
Define access duration
Define audit requirements

AI:

API
UI
Middleware
Audit integration
Tests

Collaboration:

Security
Abuse scenarios
Authorization

AI SUMMARY

Human:

Define what information AI receives
Define allowed output
Define safety constraints
Define failure behavior

AI:

Provider integration
Prompt templates
Parsing
Tests

Collaboration:

Hallucination analysis
Prompt injection
Output validation
Source attribution
DEVELOPMENT PROCESS

Every feature follows:

Human defines the problem.

Human writes requirements.

Human defines acceptance criteria.

AI researches possible solutions.

Human evaluates AI suggestions.

Human approves architecture.

AI implements the approved design.

AI generates tests.

Human reviews the implementation.

Human and AI investigate failures.

Security and edge cases are reviewed.

CI runs.

Human performs final validation.

Feature is merged.

AI CODING RULES

AI-generated code must:

Compile
Pass type checking
Pass linting
Pass relevant tests
Follow project architecture
Respect authorization
Validate input
Handle errors
Avoid sensitive-data leakage
Never contain secrets
Be understandable by the developer

Core rule:

IF I CANNOT EXPLAIN THE CODE,
I DO NOT MERGE THE CODE.

AI PROMPT STRATEGY

ARCHITECTURE

Do not ask:

"Build the architecture."

Instead ask:

"Review my proposed architecture.

Identify:

scalability problems
security problems
failure modes
unnecessary complexity
maintainability concerns

Do not write code yet."

IMPLEMENTATION

After architecture approval:

"Implement the approved design.

Do not change the architecture.

Follow these requirements:
[requirements]"

DEBUGGING

Do not immediately ask:

"Fix this bug."

Instead:

"Here is the expected behavior, actual behavior,
error, logs and relevant code.

Identify the three most likely causes.
Do not modify the code yet."

SECURITY

Ask:

"Review this implementation as a security engineer.

Look for:

broken access control
privilege escalation
injection
sensitive-data exposure
authentication weaknesses
authorization bypass
insecure file handling

Do not rewrite the code yet."

HUMAN CRITICAL-THINKING CHECKLIST

For every important feature, ask:

WHY?
Why does this feature exist?

WHAT?
What exactly does it do?

WHO?
Who can access it?

WHEN?
Under what conditions?

WHAT IF?
What happens when something fails?

SECURITY?
Can someone abuse it?

DATA?
Can information become stale or conflicting?

SCALE?
What happens with 10x the users?

AI?
Can AI produce an incorrect result?

FAILURE?
What happens if a dependency is unavailable?

CODE REVIEW CHECKLIST

Before merging AI-generated code:

[ ] I understand the code
[ ] Architecture is correct
[ ] Authorization is correct
[ ] Input is validated
[ ] Errors are handled
[ ] Sensitive data is protected
[ ] Tests exist
[ ] Edge cases were considered
[ ] No secrets are present
[ ] Performance is acceptable
[ ] Documentation is updated

SECURITY-CRITICAL FEATURES

For these features, human involvement must be high:

Authentication
Authorization
Consent
Emergency access
Audit logging
Medication safety
Context prioritization
AI output handling

Suggested effort:

Human: 50%
Collaboration: 40%
AI: 10%

REPETITIVE FEATURES

For low-risk repetitive functionality:

Human: 15%
Collaboration: 10%
AI: 75%

Examples:

CRUD
Basic UI
Form generation
Seed data
Boilerplate
Documentation drafts
Test scaffolding
DEBUGGING WORKFLOW

OBSERVE
|
v
Expected vs Actual
|
v
Human forms hypotheses
|
v
AI provides possible causes
|
v
Human chooses experiment
|
v
Test hypothesis
|
v
AI helps implement fix
|
v
Run tests
|
v
Human validates

TESTING WORKFLOW

Human:
Defines expected behavior.

AI:
Generates tests.

Human:
Reviews test coverage.

CI:
Runs automated tests.

Human:
Investigates failures and validates behavior.

DOCUMENTATION

Important engineering decisions should be documented.

Recommended files:

docs/
architecture.md
requirements.md
security.md
context-engine.md
ai-safety.md
edge-cases.md

docs/decisions/
ADR-001-architecture.md
ADR-002-database.md
ADR-003-context-engine.md
ADR-004-consent.md
ADR-005-emergency-access.md
ADR-006-ai-integration.md

docs/ai/
prompts.md
contributions.md
review-checklist.md

AI CONTRIBUTION RECORD

For important features, record:

Feature:
[Feature name]

Human contribution:

Decisions
Architecture
Requirements
Review

AI contribution:

Implementation
Tests
Research
Documentation

Collaboration:

Security
Edge cases
Debugging
Validation
DEFINITION OF DONE

A feature is complete when:

[ ] Requirement exists
[ ] Acceptance criteria exist
[ ] Architecture is understood
[ ] Implementation works
[ ] Type checking passes
[ ] Lint passes
[ ] Tests pass
[ ] Security reviewed
[ ] Edge cases considered
[ ] UI manually checked
[ ] Documentation updated
[ ] AI-generated code reviewed

FINAL OBJECTIVE

The purpose of this delegation model is NOT:

"AI built my project."

The objective is:

"I designed and engineered the system using AI as a
productivity multiplier."

By the end of the project, the developer should independently
understand:

Architecture
Database design
API design
Authentication
Authorization
Context Engine
Medication safety
Consent
Emergency access
Audit logging
AI integration
Testing
Security
Scalability
Engineering tradeoffs
CORE PRINCIPLE

AI can write the implementation.

AI can suggest solutions.

AI can generate tests.

AI can accelerate research.

But:

THE HUMAN OWNS THE SYSTEM.

The developer is responsible for understanding,
reviewing, validating and defending every important
engineering decision.