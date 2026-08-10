# ERTH — Field Training Management Platform

## Business Requirements Document — BRD

**Second version of the ERTH Matching platform** — dedicated to managing field training at the Faculty of Computer Science and Engineering, New Mansoura University

**Prepared by:** Zyad El-Laithy — ERTH Club  
**Addressed to:** Adel El-Naheef and Abed El-Muthaqaf

---

## 1. Project Background and Objective

ERTH Matching is the first student-led project of the ERTH Club at the Faculty of Computer Science and Engineering — New Mansoura University. It is a platform that forms graduation-project teams based on actual skills rather than personal acquaintance or friendship. The problem it solves: the traditional way of forming graduation teams is essentially random — students group by friendship, so the project idea may be good but the available competencies in the team don't fit executing it, and the final projects come out weaker than their real potential.

The platform's solution: a student publishes their project idea with a title and description, an AI model (Groq API) analyzes the description and suggests the technical skills required to implement it, then a matching algorithm ranks the most suitable people among everyone registered on the platform based on their skills, with a percentage compatibility score — while still keeping the option to invite friends directly for anyone who doesn't want matching. The platform is fully built and currently operating, which means any new work is a modification or addition on top of an existing system, not a build from scratch.

The Dean's request is to build on this foundation a second version of the platform that manages the field training currently running for the final-year cohort. The current training process without a platform looks like this: a trainee joins the training, teaching assistants explain the material provided by the university, and at the end they're asked to execute a project — all of this is currently managed manually, with no central tool connecting the three parties together.

The goal, then, is not to add a few pages, but to transform the platform into a complete training system that accompanies the trainee from the moment of registration through the delivery and evaluation of their final project — a general-purpose system not limited to this particular faculty's training format, so that it can later serve any company or training body wanting to manage a full training program with the same logic.

The matching engine and the skill-suggestion engine keep working exactly as they are, with no fundamental change to their logic — but they shift from being the core of the platform (as in ERTH Matching) to being an additional feature inside a larger system whose real core is managing the entire training process: trainees, trainers, training content, and the project's lifecycle from idea to delivery.

## 2. Roles

The system is built around three primary roles, plus a fourth, optional role for evaluation:

| Permission | Admin (Dean) | Trainer | Trainee |
|---|:---:|:---:|:---:|
| Manage courses and topics | ✓ | — | — |
| Assign trainers to topics/courses | ✓ | — | — |
| Add/import trainee data (Excel) | ✓ | — | Self-registration also |
| Upload training content (materials) | ✓ | ✓ | — |
| Post a project idea | — | — | ✓ |
| AI skill suggestion on publish | automatic on publish | — | views the result |
| Matching with a project team | — | — | ✓ |
| Vote/evaluate ideas | optional | optional (faculty) | — |
| Upload project documentation | — | — | ✓ |
| Generate a professional Proposal via AI | — | — | one click |
| Track progress across courses (Dashboard) | all courses | own course only | own project only |

- **Admin (Dean or delegate):** manages courses, assigns trainers, imports trainee data, and tracks everything from a single dashboard.
- **Trainer (teaching assistant):** responsible for one topic within a course or for the entire course — depending on the assignment — and uploads the content for their area of responsibility.
- **Trainee (student):** registers, follows the content, publishes their project idea, receives skill suggestions and matching, and uploads the final documentation.
- **Evaluation Committee (faculty members):** votes on and scores submitted ideas to distinguish the best ones — a simple role that doesn't require full administrative permissions.

## 3. Functional Requirements

A breakdown of every functional module in the system, including the proposed implementation approach for each point, not just a general description:

### 3.1 User Registration and Account Management

- Bulk import from an Excel file the faculty already has: the upload screen shows the admin a mapping step that links each Excel column (name, university ID, email, course/section) to its corresponding field in the database, instead of assuming a fixed column order that may differ from one batch to another.
- Self-registration directly by the student through a simple form, with account activation via university email where possible, to ensure registered users are genuinely enrolled at the faculty.
- Manual individual entry by the admin as a third, fallback option for individual cases or exceptions after bulk import is closed.
- Each account holds a single role (admin / trainer / trainee), with the possibility that the same person is a trainer in one course and a trainee in the original matching system — the two roles don't conflict because they are separate tables in the database.
- On duplication (the same email or university ID already exists), the system displays a warning instead of silently creating a duplicate account — a point that is often overlooked in bulk imports and causes data chaos later.

### 3.2 Course and Topic Management (Training Courses)

- Each training Course has a name, description, start and end date, and status (active / completed / archived), and contains several Topics ordered chronologically, visible to the trainee as a study plan.
- Each topic has a title, a short description, attached training content, and a responsible trainer — plus an expected completion date if the admin wants to schedule the course over time.
- Trainer assignment works two ways, and both stay available on the same screen: assigning a single trainer responsible for the entire course (all its topics), or assigning a different trainer to each individual topic — the admin picks the appropriate method when creating the course, and the system allows changing it later if a trainer needs to be replaced.
- Uploading training content (PDF or Word files, external links, uploaded videos or YouTube links) for each topic, by the responsible trainer only — a trainer cannot edit another trainer's topic.
- The trainee sees only the content of the course they are enrolled in, ordered by topic, with an optional "viewed" marker that helps the admin track each trainee's content progress before the project phase.

### 3.3 Ideas, AI, and Matching

- The exact same existing skill-suggestion engine is reused without any change to its logic: the idea's title and description are sent to the Groq API, which returns a list of the technical skills required to implement the idea, in the same format used in ERTH Matching.
- The exact same matching algorithm between ideas and registered trainees is reused, based on their skills within the training course, with the same percentage-compatibility mechanism and the direct friend-invitation option as an alternative.
- **New addition:** generating a complete, professional Proposal for each idea with a single click, via the same free API (Groq or Gemini) — it takes the idea's title, description, and suggested skills, and turns them into a complete presentation document covering: problem definition, proposed solution, technologies used, and an initial phased execution plan.
- The resulting Proposal is raw text (Markdown or HTML) displayed inside the platform, and the trainee can edit it manually before finalizing it — it is not auto-approved without human review, since the AI model may occasionally need a simple correction.
- Idea evaluation: Faculty Voting on each idea using a simple numeric rating (e.g., 1 to 5) with an optional notes field — averages are calculated automatically, and the top-rated ideas are shown on a dedicated showcase board to motivate the rest of the trainees.

### 3.4 Project Documentation

- Uploading the final project documents (report, presentation, GitHub code link) by each trainee directly on the platform, linked to the idea and the team formed through matching — meaning every document is automatically linked to its owners with no extra manual entry.
- Defining allowed file formats and sizes (e.g., PDF and PPTX up to 20 MB) to prevent uploading arbitrary files that burden storage.
- A filterable archive by course, year, and project status (in progress / submitted / evaluated) — allowing the dean and trainers to review all projects from one place without manually searching across cohorts.

### 3.5 Admin Dashboard

- A comprehensive overview of all active courses, the number of trainees in each, each project's status, and voting results — without having to enter each course individually.
- Quick indicator cards at the top of the dashboard: total number of trainees, number of published ideas, number of submitted projects, and documentation completion rate — giving the dean an instant picture without manual analysis.
- The ability to export any data table (trainees, projects, evaluations) to Excel for any administrative use outside the platform, since university departments often need paper or archival reports.

### 3.6 Evaluation Committee (Faculty)

- A simplified role that doesn't need a full dashboard: a single page showing the ideas to be evaluated, with a quick voting form for each idea.
- This role can be entirely optional — if faculty members don't have time to use the platform, idea evaluation can still be done manually by the admin as a fallback plan, so the workflow doesn't depend on an external party's availability.

## 4. Platform Workflow

The trainee's journey from day one of training through final delivery:

| Step | Stage | Description |
|---:|---|---|
| 1 | **Registration** | Bulk import from the admin's Excel file, or self-registration by the student, automatically added to their course. |
| 2 | **Training Content** | The trainee follows the topics of their course and the materials uploaded by the trainer responsible for each topic. |
| 3 | **Publishing the Project Idea** | The trainee writes the idea's title and description. |
| 4 | **AI Skill Suggestion** | The Groq API analyzes the description and suggests the technical skills required to implement the idea. |
| 5 | **Matching / Inviting Friends** | The matching algorithm recommends suitable team members, or the trainee invites teammates directly. |
| 6 | **Generating a Professional Proposal** | With one click, the idea's title, description, and skills are turned into a ready presentation document via the AI API. |
| 7 | **Faculty Evaluation** | The evaluation committee votes on and scores the submitted ideas, highlighting the best ones. |
| 8 | **Execution and Documentation** | The team executes the project and uploads the final documentation and deliverables to the platform. |
| 9 | **Admin Monitoring** | The dean tracks every stage from a single dashboard, from registration through final submission. |

## 5. Proposed Technical Architecture

Built on top of the same existing ERTH Matching technology stack, adding only the layers needed for training management — without rebuilding from scratch. The core idea: any new table or endpoint is added alongside what already exists; the current, tested matching architecture is not modified.

- **Frontend — React:** the three role-based screens + admin dashboard + the existing matching screen, unchanged.
- **Backend — PHP:** the same existing backend + new endpoints: courses, topics, trainer assignment, file upload.
- **AI Layer — Groq API (free):** skill suggestion (existing) + professional Proposal generation (new, using the same key).
- **Database:** new tables built on top of the existing matching tables, without breaking them.

### 5.1 Proposed New Database Tables

| Table | Description |
|---|---|
| `courses` | Course data (name, description, start/end date, status). |
| `topics` | Topics for each course, linked to `id_course` and ordered by `index_order`. |
| `assignments_trainer` | Links a trainer to an `id_course` or `id_topic` — a single nullable column determines whether the assignment is at course level or a single topic. |
| `enrollments_trainee` | Each trainee's enrollment in a given course, with enrollment date and source (import / self-registration / manual). |
| `documents` | Uploaded documentation files, linked to the idea/team produced by the existing matching system, with file type and upload date. |
| `votes` | Each faculty member's evaluation of each idea (score, id_evaluator, id_idea, optional note). |

These six tables are the only real addition to the database — everything related to users, skills, and the matching system itself stays exactly as it is in the current ERTH Matching, untouched.

### 5.2 Technical Points to Settle Before Starting

- **File storage (materials and documentation):** local storage on the server is a first step, fully sufficient for the current scale (roughly 210 trainees), with the option to later migrate to free cloud storage (such as Cloudflare R2 or Supabase Storage) if volume grows significantly — no need to over-engineer this point from the start.
- **Authorization:** every backend endpoint checks the user's role (admin/trainer/trainee) before executing any operation — a single centralized middleware for role-checking is preferred over repeating the same check in every controller.
- **Groq API key:** stored in server-side environment variables (`.env`) only, and never called directly from the frontend — the request always passes through the backend so the key never appears in browser-side code.
- **Hosting:** can start on any free or low-cost hosting that supports PHP and MySQL (such as university hosting if available, or free services for student projects), with regular database backups taken seriously from day one of actual operation.

## 6. Execution Plan via Vibe Coding

The execution team (Adel and Abed) will work using vibe coding — meaning relying on an Agent-based tool that writes code from a prompt, whether Cursor, Antigravity, or any similar tool. The success factor here isn't writing code fast — the tools already handle that — it's how tasks are broken down and how context is set so that every Agent session produces code consistent with the rest of the project, instead of code that works in isolation but conflicts with everything else.

This plan is divided into preparation steps, then task ordering, then execution rules, then review.

### 6.1 Preparation Before Opening Any Agent Session

- Prepare a single context file (e.g., `PROJECT_CONTEXT.md`) that explains to the Agent: what the platform is, what already exists from ERTH Matching, and what will be added — paste a summary of this document into it. Most vibe coding tools (Cursor, Antigravity, and others) read this kind of file when placed at the project root, so every Agent session works from the same understanding without re-explaining every time.
- Write the database schema manually first (even a simple version) and fix it as a single reference SQL file in the project — before giving the Agent any task, so every session builds on the same structure and no conflicting tables get created twice across separate sessions.
- If the tool used supports a project rules file (such as `.cursorrules` in Cursor or its equivalent in any other tool), write in it: the file-naming convention, the current Controllers style used in the project, and the React components style — so any Agent follows it automatically without it needing to be repeated in every prompt.

### 6.2 Task Ordering (Module by Module, Not One Giant Prompt)

| Phase | Description |
|---|---|
| **Phase 1 — Foundation** | Modify the database by adding the six new tables, and build the three-role system on top of the existing user system. This is the most critical task since every following task depends on it, and it must be thoroughly tested before proceeding. |
| **Phase 2 — Courses & Content** | Full CRUD for courses and topics, the trainer-assignment screen, and training content upload. Fully independent of the matching system, with zero friction against existing code. |
| **Phase 3 — Registration & Import** | The Excel import screen with column mapping, self-registration, and linking each trainee to their course. |
| **Phase 4 — AI Layer** | A single dedicated task for generating the professional Proposal, built on the exact same Groq API call pattern already used for skill suggestion — the pattern is copied, only the prompt changes. |
| **Phase 5 — Documentation & Evaluation** | Uploading project documents, the faculty voting page, and the leaderboard highlighting the best ideas. |
| **Phase 6 — Admin Dashboard** | Deliberately the last task, since it aggregates data from every previous phase (courses, trainees, projects, evaluations), so it naturally comes after everything else has stabilized. |

- Every task must be actually tested (a real run, not just reading the code) before moving to the next task — moving quickly between tasks before confirming the previous one is solid is the single biggest cause of accumulating bugs in vibe-coding projects.
- Overall priority order: Phases 1, 2, and 3 first (foundation, courses, registration), since they're needed to get the current training running quickly; the remaining phases (auto-Proposal, voting, dashboard) are added incrementally without stopping use of the base system.

### 6.3 Example of Wording a Single Task Prompt

Instead of a generic prompt like "build the courses page," a more precise and useful prompt specifies: the related table, the roles allowed access, the required form fields, and the coding style to follow. It's best to write the prompt directly in English, since most vibe coding tools are better trained on it, even if the rest of the document is in Arabic. Short example:

> Build a complete CRUD for the courses table, following the schema in `database/schema.sql`. This screen is accessible only to the admin role (reuse the existing middleware in `middleware/auth.php`). The form fields are: course name, description, start date, end date. Match the React structure and conventions already used in `src/pages/Matching` — same folder structure and the same API-calling pattern via `services/api.js`. Do not create a new authentication system; use the existing auth context.

### 6.4 During and After Every Task

- Review every change before merging (manual code review or a dedicated second Agent for review) — vibe coding speeds up writing but needs somewhat more human review than usual, especially around permission points (is the trainer endpoint locked to non-trainers?).
- Use a separate Git branch for each module (e.g., `courses/feature`, `documents/feature`) and merge into `main` only after testing — this makes it easy to roll back a single task if a problem appears, without affecting the rest of the project.
- Write a simple manual checklist for each task before considering it done: do the three roles see only what they're supposed to see? Does uploading an oversized file get rejected correctly? Is data saved correctly if an empty form is submitted? — five minutes of manual checking saves hours of fixing later.

## 7. Additional Suggestions Serving the Goal

Fully free additions that would make the platform usable as a comprehensive training service for any organization, not just the faculty:

- Automatic completion certificates (PDF) generated for each trainee who successfully finishes their course — at no cost, via server-side PDF generation.
- A simple notification system (in-platform or via free email) when new content is published, a trainer is assigned, or a voting result is out.
- An analytics dashboard for the dean: number of trainees per course, documentation completion rate, average idea rating — simple charts giving a quick picture without drilling into every detail.
- Idea similarity checking using the same AI API to compare a new idea against previously stored ideas, alerting the trainee if their idea is close to an existing one — raising the originality bar.
- A simple Q&A section per topic, letting trainees ask their trainer questions without scattered WhatsApp groups.
- A course timeline/calendar (when each topic ends, the deadline for documentation) shown to both trainee and trainer.
- A public archive of the best projects after each course ends — building a reputation for the platform itself and motivating upcoming cohorts.

## 8. Conclusion

The new version doesn't replace ERTH Matching — it builds on top of it: the same skill-suggestion engine, the same matching algorithm, but wrapped inside a complete administrative shell that manages field training from the first day of registration through project delivery and evaluation — with clear roles (admin, trainer, trainee), centralized training content and documentation, and AI-generated professional proposals at no cost.

This design allows the platform to later grow into a training service offered to any company or organization, not limited to the university alone.
