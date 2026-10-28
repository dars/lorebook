## ADDED Requirements
### Requirement: Inline draft selection
The picker SHALL select and deselect in place, separate details from selection, and save changes only on confirmation.
#### Scenario: Select and cancel
- **WHEN** a user toggles spells then discards the draft
- **THEN** the character remains unchanged
#### Scenario: Save changes
- **WHEN** the user saves a draft
- **THEN** only the selection delta is applied, preserving snapshots and unrelated character updates
### Requirement: Accessible selection review
The picker SHALL offer search, all/selected views, visible counts and persistent save/cancel controls at all viewport sizes.
#### Scenario: Review selections
- **WHEN** the user switches to selected
- **THEN** all selected spells including unavailable catalog or custom snapshots remain reviewable and removable
### Requirement: Consistent related selectors
Related selectors SHALL keep selection controls local and long editor actions visible.
#### Scenario: Long editor
- **WHEN** a user scrolls a long editor
- **THEN** save and cancel remain visible without covering content
