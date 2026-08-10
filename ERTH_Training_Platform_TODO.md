# ERTH Training Platform — Development TODO List

Source: ERTH Field Training Dev Prompts

---

## Phase 1 — Foundation: Roles & Database

> Must be completed and tested before moving to Phase 2.

### 1.1 — Database Foundation
- [ ] Inspect existing project database/migration system
- [ ] Read `database/schema.sql`
- [ ] Apply the 6 new tables using the project's existing migration approach
- [ ] Do not manually retype the schema
- [ ] Create a verification query/script
- [ ] Verify all 6 tables exist
- [ ] Verify all foreign keys point to the correct existing tables
- [ ] Run verification and inspect results

### 1.2 — Role System
- [ ] Add nullable `role` column to existing `users` table
  - [ ] `admin`
  - [ ] `trainer`
  - [ ] `trainee`
- [ ] Do not remove/rename existing user columns
- [ ] Inspect existing middleware conventions
- [ ] Create centralized role authorization middleware
- [ ] Support `requireRole('admin')`
- [ ] Support `requireRole(['admin', 'trainer'])`
- [ ] Create admin test route
- [ ] Create trainer test route
- [ ] Create trainee test route
- [ ] Seed/test one user for each role
- [ ] Verify unauthorized roles are denied
- [ ] Confirm role system does not interfere with ERTH Matching
- [ ] Confirm existing login flow remains unchanged

### 1.3 — Duplicate Account Guard
- [ ] Create reusable server-side duplicate-account helper
- [ ] Check duplicate email
- [ ] Check duplicate university ID
- [ ] Return structured duplicate error
- [ ] Prevent duplicate insertion
- [ ] Make future registration systems reuse this helper

### Phase 1 Gate
- [ ] Admin can log in
- [ ] Trainer can log in
- [ ] Trainee can log in
- [ ] Each role is blocked from other roles' test routes
- [ ] Six tables exist
- [ ] Foreign keys verified
- [ ] Duplicate email is rejected
- [ ] Existing ERTH Matching login/register still works

---

## Phase 2 — Courses, Topics & Training Content

> Must remain completely independent from the existing Matching engine.

### 2.1 — Courses CRUD
- [ ] Create Courses backend controller
- [ ] Create REST endpoints
- [ ] Implement course creation
- [ ] Implement course listing
- [ ] Implement course editing
- [ ] Implement course deletion
- [ ] Course name — required
- [ ] Course description
- [ ] Start date
- [ ] End date
- [ ] Status: active / completed / archived
- [ ] Default status = `active`
- [ ] Admin-only authorization
- [ ] Show enrolled trainee count
- [ ] Show topic count
- [ ] Calculate counts server-side
- [ ] Follow existing React structure
- [ ] Reuse `services/api.js`
- [ ] Reuse existing authentication context

### 2.2 — Topics CRUD
- [ ] Add topics inside `courses/:id`
- [ ] Implement topic creation
- [ ] Implement topic listing
- [ ] Implement topic editing
- [ ] Implement topic deletion
- [ ] Title — required
- [ ] Short description
- [ ] Trainer
- [ ] Due date
- [ ] `order_index`
- [ ] Implement drag-to-reorder
- [ ] Persist order as integer
- [ ] Display topics according to `order_index`
- [ ] Prepare topic order for trainee timeline
- [ ] Admin can manage all topics
- [ ] Trainer can edit only assigned topics

### 2.3 — Trainer Assignment
- [ ] Build trainer assignment UI on course detail page
- [ ] Implement Whole Course mode
- [ ] Select trainer from `role=trainer`
- [ ] Store course-level assignment with `topic_id = NULL`
- [ ] Implement Per Topic mode
- [ ] Allow different trainer per topic
- [ ] Store topic-level assignment with `course_id = NULL`
- [ ] Allow switching between modes
- [ ] Allow trainer reassignment
- [ ] Resolve trainer by checking topic-level assignment first
- [ ] Fall back to course-level assignment

### 2.4 — Topic Content Upload
- [ ] Add content panel to each topic
- [ ] Visible to admin/trainer
- [ ] Support PDF upload
- [ ] Support Word upload
- [ ] Support video upload
- [ ] Support external URL
- [ ] Support YouTube URL
- [ ] Reuse existing project file-storage approach
- [ ] If none exists, use `/uploads/training`
- [ ] Implement server-side trainer ownership check
- [ ] Trainer can edit only assigned topic
- [ ] Wrong trainer receives `403`
- [ ] Admin can always edit content
- [ ] Test direct endpoint access

### 2.5 — Trainee Training Content
- [ ] Create trainee course-content page
- [ ] Show only enrolled course
- [ ] Load enrollment through `trainee_enrollments`
- [ ] Display topics in `order_index`
- [ ] Render as timeline/study plan
- [ ] Block direct URL access to another course
- [ ] Implement optional Mark as Viewed
- [ ] Add `trainee_topic_progress` if required
  - [ ] `trainee_id`
  - [ ] `topic_id`
  - [ ] `viewed_at`
- [ ] Update `database/schema.sql`
- [ ] Re-run migration
- [ ] Create completion percentage endpoint
- [ ] Return viewed percentage per trainee/course

### Phase 2 Gate
- [ ] Admin can create course
- [ ] Admin can create/reorder topics
- [ ] Whole-course trainer assignment works
- [ ] Per-topic trainer assignment works
- [ ] Switching assignment modes works
- [ ] Trainer gets `403` for another trainer's topic
- [ ] Trainee only sees enrolled course
- [ ] Direct URL access to another course is blocked

---

## Phase 3 — Registration, Import & Enrollment

### 3.1 — Excel Bulk Import
- [ ] Inspect `composer.json`
- [ ] Identify existing Excel/CSV library
- [ ] Reuse existing library if available
- [ ] Create admin-only import screen
- [ ] Select target course
- [ ] Upload `.xlsx`
- [ ] Parse header row
- [ ] Display preview of first rows
- [ ] Build manual column mapping
- [ ] Map columns to full name
- [ ] Map columns to university ID
- [ ] Map columns to email
- [ ] Map columns to course/section
- [ ] Do not assume column order
- [ ] Parse all rows according to mapping
- [ ] Run duplicate-account guard on every row
- [ ] Categorize results:
  - [ ] Created
  - [ ] Skipped — duplicate
  - [ ] Row error
- [ ] Display import summary
- [ ] Display skipped/error rows with reasons
- [ ] Create successful trainee accounts
- [ ] Set role = `trainee`
- [ ] Create enrollment
- [ ] Set `source = 'import'`

### 3.2 — Self Registration
> The source references self-registration in the Phase 3 checklist but does not provide a dedicated Task 3.2 prompt.

- [ ] Verify existing self-registration behavior
- [ ] Ensure duplicate-account guard is used
- [ ] If email verification is enabled, block/queue account pending confirmation
- [ ] Confirm existing registration flow is not broken

### 3.3 — Manual Trainee Entry
- [ ] Admin-only form
- [ ] Full name
- [ ] University ID
- [ ] Email
- [ ] Course
- [ ] Reuse duplicate-account guard
- [ ] Create trainee account
- [ ] Set role = `trainee`
- [ ] Create enrollment
- [ ] Set `source = 'manual'`

### Phase 3 Gate
- [ ] Excel with unusual column order imports correctly
- [ ] Duplicate email is reported, not duplicated
- [ ] Row errors are reported
- [ ] Self-registration behavior verified
- [ ] Manual trainee creation works
- [ ] `source='manual'` verified

---

## Phase 4 — AI Proposal Generation

> Do not modify the existing skill-suggestion AI call or matching algorithm.

### 4.1 — Generate Proposal
- [ ] Locate existing Groq skill-suggestion implementation
- [ ] Inspect API client/library
- [ ] Inspect API key loading
- [ ] Inspect request structure
- [ ] Inspect response parsing
- [ ] Inspect error handling
- [ ] Copy existing pattern
- [ ] Do not refactor existing skill-suggestion code
- [ ] Create `Generate Proposal` endpoint
- [ ] Input idea title
- [ ] Input idea description
- [ ] Input AI-suggested skills
- [ ] Generate Problem Statement
- [ ] Generate Proposed Solution
- [ ] Generate Technologies Used
- [ ] Generate phased Implementation Plan
- [ ] Return Markdown or HTML consistently
- [ ] Restrict endpoint to idea owner or admin
- [ ] Reuse existing ownership authorization

### 4.2 — Editable Proposal
- [ ] Display generated proposal
- [ ] Make proposal editable
- [ ] Pre-fill editor with AI output
- [ ] Add Save / Finalize
- [ ] Add Regenerate
- [ ] Add confirmation before Regenerate
- [ ] Prevent accidental loss of unsaved edits
- [ ] Persist finalized proposal
- [ ] Add `proposal_text` using the least-invasive schema option
- [ ] Make proposal retrievable by later documentation/evaluation screens

### Phase 4 Gate
- [ ] Real idea generates all 4 sections
- [ ] Existing skill-suggestion endpoint still works
- [ ] Proposal editing works
- [ ] Save persists
- [ ] Regenerate requires confirmation
- [ ] Existing matching functionality remains unchanged

---

## Phase 5 — Documentation & Faculty Evaluation

### 5.1 — Final Documentation
- [ ] Create trainee project documentation screen
- [ ] Support report upload
- [ ] Support presentation upload
- [ ] Support GitHub URL
- [ ] Store in `documents`
- [ ] Automatically determine trainee's idea/team
- [ ] Do not ask trainee to manually select team
- [ ] Enforce file types server-side
- [ ] Enforce maximum file size
- [ ] Support PDF
- [ ] Support PPTX
- [ ] Maximum example size: 20 MB
- [ ] Return clear validation errors
- [ ] Reuse Phase 2 file storage

### 5.2 — Project Archive
- [ ] Create project archive screen
- [ ] Accessible to admin/trainers
- [ ] Show all submitted projects
- [ ] Add course filter
- [ ] Add year filter
- [ ] Add status filter
  - [ ] In progress
  - [ ] Submitted
  - [ ] Evaluated
- [ ] Derive status server-side
- [ ] Link to project documents
- [ ] Link to generated proposal when available

### 5.3 — Faculty Evaluation
- [ ] Decide role implementation:
  - [ ] Dedicated `evaluator` role
  - [ ] OR scoped trainer permission
- [ ] Document chosen approach
- [ ] Create evaluation screen
- [ ] Show ideas awaiting evaluator score
- [ ] Rating = 1–5
- [ ] Optional notes
- [ ] Store in `votes`
- [ ] Prevent duplicate evaluator/idea rows
- [ ] Re-submit updates existing vote
- [ ] Create Top Ideas leaderboard
- [ ] Calculate average score server-side
- [ ] Sort descending
- [ ] Show evaluator note count
- [ ] Make leaderboard available to admin
- [ ] Optionally expose leaderboard to trainees
- [ ] Ensure evaluation system is optional
- [ ] Admin can still manually evaluate

### Phase 5 Gate
- [ ] Wrong file type rejected
- [ ] Oversized file rejected
- [ ] Uploaded document automatically links to correct team
- [ ] Archive filters work
- [ ] Second vote updates instead of duplicates
- [ ] Leaderboard averages match database calculations

---

## Phase 6 — Admin / Dean Dashboard

> Build only after Phases 1–5 are stable.

### 6.1 — Overview Dashboard
- [ ] Create admin dashboard landing page
- [ ] Show active courses
- [ ] Show trainee count per course
- [ ] Show topic count per course
- [ ] Show project-status summary
- [ ] Show voting results
- [ ] Calculate average score per course
- [ ] Verify correct Matching → enrollment → course relationship

### 6.2 — KPI Cards
- [ ] Total trainees — distinct trainees
- [ ] Total published ideas
- [ ] Total submitted projects
- [ ] Documentation completion rate
- [ ] Calculate server-side
- [ ] Use one endpoint
- [ ] Avoid frontend N+1 queries

### 6.3 — Excel Export
Add Export to Excel to:
- [ ] Trainee table
- [ ] Project archive
- [ ] Evaluation/votes table
- [ ] Reuse Excel library from Phase 3
- [ ] Generate real `.xlsx`
- [ ] Match table headers
- [ ] Match displayed data
- [ ] Trigger frontend download

### Phase 6 Gate
- [ ] Dashboard loads efficiently
- [ ] No visible N+1 issue
- [ ] KPI numbers match database
- [ ] Excel exports open correctly
- [ ] Exported data exactly matches UI

---

## Phase 7 — Review, Testing & Git Workflow

### After EVERY Task
- [ ] Create/update manual test checklist
- [ ] Implement task
- [ ] Test normal case
- [ ] Test unauthorized access
- [ ] Test empty input
- [ ] Test invalid input
- [ ] Test edge cases
- [ ] Test database changes
- [ ] Review code
- [ ] Check authorization
- [ ] Check existing functionality was not broken
- [ ] Commit changes
- [ ] Merge only after tests pass

### Suggested Git Branches
- [ ] `feature/roles`
- [ ] `feature/courses`
- [ ] `feature/topics`
- [ ] `feature/trainer-assignment`
- [ ] `feature/training-content`
- [ ] `feature/enrollment`
- [ ] `feature/ai-proposal`
- [ ] `feature/documents`
- [ ] `feature/evaluation`
- [ ] `feature/admin-dashboard`

### Important Rules
- [ ] Do not start the next task until the current task is verified
- [ ] Review authorization carefully, especially trainer ownership
- [ ] Keep each module isolated enough to roll back safely

### Recommended Priority
1. [ ] Phase 1 — Foundation
2. [ ] Phase 2 — Courses/Training
3. [ ] Phase 3 — Registration/Enrollment
4. [ ] Phase 4 — AI Proposal
5. [ ] Phase 5 — Documentation/Evaluation
6. [ ] Phase 6 — Dashboard

---

## Phase 9 — Optional Enhancements

> Only start after Phase 6 is stable.

### 9.1 — Completion Certificates
- [ ] Check `composer.json` for existing PDF library
- [ ] Reuse existing library if available
- [ ] Otherwise use a free established PDF library
- [ ] Generate certificate at 100% completion
- [ ] Allow admin manual generation
- [ ] Include trainee name
- [ ] Include course name
- [ ] Include completion date
- [ ] Return downloadable PDF

### 9.2 — Notifications
- [ ] Create `notifications` table
- [ ] Add `user_id`
- [ ] Add `message`
- [ ] Add `read`
- [ ] Add `created_at`
- [ ] Add notification bell or free email
- [ ] Notify on new topic content
- [ ] Notify on trainer assignment changes
- [ ] Notify on new evaluation result
- [ ] Add notification endpoint
- [ ] Fetch/poll notifications from frontend

### 9.3 — Idea Similarity Check
- [ ] Trigger when trainee submits idea
- [ ] Reuse Phase 4 AI API pattern
- [ ] Compare against recent/relevant ideas
- [ ] Keep comparison set small
- [ ] Generate similarity assessment
- [ ] Warn trainee on high similarity
- [ ] Do not block submission

### 9.4 — Per-topic Q&A
- [ ] Create threaded Q&A
- [ ] Question text
- [ ] Trainee author
- [ ] Optional trainer reply
- [ ] Trainee sees only their course's Q&A
- [ ] Trainer sees only assigned-topic Q&A
- [ ] Reuse Phase 2.4 ownership authorization

### 9.5 — Course Calendar
- [ ] Create course timeline/calendar
- [ ] Show topic due dates
- [ ] Show final documentation deadline
- [ ] Use existing `topics.due_date`
- [ ] Use existing course dates
- [ ] No unnecessary backend logic

### 9.6 — Public Top Projects Archive
- [ ] Confirm visibility with admin:
  - [ ] Public
  - [ ] Faculty-only
- [ ] Only show completed courses
- [ ] Reuse Phase 5 leaderboard
- [ ] Display highest-voted projects

---

# Final Development Order

```text
PHASE 1
├── 1.1 Database
├── 1.2 Roles
├── 1.3 Duplicate Guard
└── TEST / REVIEW / MERGE

PHASE 2
├── 2.1 Courses
├── 2.2 Topics
├── 2.3 Trainer Assignment
├── 2.4 Content Upload
├── 2.5 Trainee Content
└── TEST / REVIEW / MERGE

PHASE 3
├── 3.1 Excel Import
├── 3.2 Self Registration
├── 3.3 Manual Entry
└── TEST / REVIEW / MERGE

PHASE 4
├── 4.1 AI Proposal
├── 4.2 Proposal Editing
└── TEST / REVIEW / MERGE

PHASE 5
├── 5.1 Documentation
├── 5.2 Project Archive
├── 5.3 Evaluation
└── TEST / REVIEW / MERGE

PHASE 6
├── 6.1 Dashboard
├── 6.2 KPIs
├── 6.3 Excel Export
└── FINAL TEST / REVIEW / MERGE

PHASE 9 — OPTIONAL
├── 9.1 Certificates
├── 9.2 Notifications
├── 9.3 Similarity Check
├── 9.4 Q&A
├── 9.5 Calendar
└── 9.6 Public Archive
```

> Note: The source jumps from Task 3.1 to Task 3.3, so 3.2 above is only a logical label for the self-registration checklist item. The source also has a numbering inconsistency around Phase 7/8; this TODO preserves the intended execution workflow rather than inventing a missing phase.
