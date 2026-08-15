# Implementation Plan: Student Teammate Selection & Team Project Access

Add a requirement during project submission allowing trainees to select their teammates for a project. Prevent conflict by ensuring each student can be in only 1 project per course, indicating existing team status with a visual badge in the student search, and making projects visible on the dashboards of all team members.

## User Review Required

> [!IMPORTANT]
> - **1 Project Per Course Constraint**: Both team leaders and invited teammates will be restricted to a single project per course. If a selected teammate is already in another team, the submission will be rejected with an explicit error message.
> - **Search Criteria**: Search will match students by **Full Name**, **Academic Student ID**, **Username**, or **Email**.
> - **Team Member Dashboard Access**: Students added as teammates will automatically see the project in their dashboard (`/courses/:id` Project Idea tab and `/submitted-projects` list).

## Proposed Changes

### Database & Backend API

#### [NEW] [api/migrations/015_create_training_idea_members.sql](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/api/migrations/015_create_training_idea_members.sql)
#### [MODIFY] [api/config.php](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/api/config.php)
- Add `training_idea_members` table creation to `_autoMigrate()` function to store team members per project idea (`idea_id`, `user_id`, `role` as `'leader'` or `'member'`).

#### [NEW] [api/training/ideas/search_teammates.php](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/api/training/ideas/search_teammates.php)
- New endpoint to search for students for a specific course.
- Checks if each student is already in a team for the given `course_id`.
- Returns `is_in_team: true/false` flag and `existing_project_title` so frontend can display the "Already in a Team" badge and disable selection.

#### [MODIFY] [api/training/ideas/submit.php](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/api/training/ideas/submit.php)
- Receive `teammate_ids` array in body.
- Validate that neither the submitter nor any selected teammate is already enrolled in another project team for the course.
- Insert/sync rows in `training_idea_members` for the leader and teammates.

#### [MODIFY] [api/training/ideas/get.php](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/api/training/ideas/get.php)
- Allow trainees who are team members (`training_idea_members`) to retrieve the course project.
- Attach `team_members` array to the returned project idea object.

#### [MODIFY] [api/training/ideas/list.php](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/api/training/ideas/list.php)
- Allow trainees who are team members to view the project in their project list.
- Attach `team_members` array with names, IDs, and roles to returned project items.

---

### Frontend

#### [NEW] [frontend/src/components/TeammateSelector.jsx](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/frontend/src/components/TeammateSelector.jsx) & [TeammateSelector.css](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/frontend/src/components/TeammateSelector.css)
- Reusable React component for project teammate search and selection.
- Features live search by name or ID, badge display for students already in a team, add/remove teammate chips, and bilingual support (EN/AR).

#### [MODIFY] [frontend/src/pages/TrainingCourseDetail.jsx](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/frontend/src/pages/TrainingCourseDetail.jsx)
- Embed `TeammateSelector` in the Project Idea submission form.
- Pass `teammate_ids` on submission.
- Display full team roster (Leader & Members) when viewing the project.

#### [MODIFY] [frontend/src/pages/TraineeProjects.jsx](file:///d:/ERTH/UNI%20EDITION/ERTH-training-center/frontend/src/pages/TraineeProjects.jsx)
- Embed `TeammateSelector` in the Post/Edit Project modal.
- Display team members list on project cards.

---

## Verification Plan

### Automated/API Verification
- Test `search_teammates.php` with query strings (name & ID) and verify `is_in_team` indicator.
- Test `submit.php` with valid teammates and verify insertion into `training_idea_members`.
- Test `submit.php` with a teammate already in a project to confirm conflict prevention error.
- Test `get.php` and `list.php` logged in as a teammate to ensure team project visibility.

### Manual Verification
- Log in as Student A (Team Leader), open course project submission, search for Student B by name and Student C by ID.
- Add Student B and submit project.
- Log in as Student D, attempt to search for Student B for the same course -> Verify "Already in a Team" badge is displayed and Student B cannot be added.
- Log in as Student B -> Verify Student B sees the project in their course project page and `/submitted-projects` dashboard.
