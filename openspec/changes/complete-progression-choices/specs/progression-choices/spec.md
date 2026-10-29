## ADDED Requirements
### Requirement: Complete progression choices
The system SHALL provide each SRD class and supported subclass choice listed by the growth guide, including prerequisite-dependent nested choices, human bonus origin feat, spellbook and prepared spells.
#### Scenario: Class advancement
- **WHEN** a character advances
- **THEN** eligible new selections and optional replacements are shown with counts and validated before saving
#### Scenario: Existing character
- **WHEN** a character has missing choices
- **THEN** a backfill flow preserves level, HP, spent resources and existing manual content
### Requirement: Replacement timing
The system SHALL enforce class-specific replacement count, timing and dependencies.
#### Scenario: Fighter mastery
- **WHEN** a Fighter completes a long rest
- **THEN** at most one known mastery weapon may be replaced
#### Scenario: Dependent invocation
- **WHEN** a selected invocation depends on another
- **THEN** a replacement cannot remove its prerequisite
### Requirement: Safe persistence and effects
The system SHALL persist source-scoped selections and apply mechanical effects idempotently without erasing custom data.
#### Scenario: Reload
- **WHEN** a selected character is saved and reloaded
- **THEN** all choices and derived expertise remain intact
#### Scenario: Wizard spells
- **WHEN** a Wizard gains spellbook entries
- **THEN** they do not all become prepared or consume subclass-granted quotas
### Requirement: Visible status
The system SHALL display selected choices in character views and mark guide coverage accurately.
#### Scenario: Read-only sharing
- **WHEN** a shared character is opened
- **THEN** selections are visible and no edit operation is available
