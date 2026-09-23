# GCL — MASTER PRODUCT REQUIREMENTS DOCUMENT

## Product Name

GCL — Gen Code League

## Document

GCL Master Product Requirements Document

## Version

3.0

## Product Type

Permanent Edition-Based Competitive Technology League Platform

## Primary Stack

- Frontend: React + Vite + TypeScript
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Realtime: Supabase Realtime
- Storage: Supabase Storage
- Hosting: Vercel
- Styling: CSS / component-based UI system

---

# 1. PRODUCT OVERVIEW

GCL (Gen Code League) is a permanent competitive technology league platform.

The platform must not be built as a single-year website.

It must support multiple editions:

- GCL 2026
- GCL 2027
- GCL 2028
- GCL 2029
- Future editions

Each edition must have its own:

- Teams
- Team members
- Rounds
- Questions
- Scores
- Auction data
- Budgets
- Transactions
- Results
- Winners
- Certificates
- Announcements
- Gallery
- Statistics
- Audit history

The same platform must be reusable every year without rebuilding the application.

---

# 2. CORE PRODUCT PRINCIPLE

The previous GCL workflow is the functional reference.

The new platform should:

1. Preserve all important previous-year functionality.
2. Improve the UI and user experience.
3. Improve security.
4. Improve administration.
5. Make the system reusable for future editions.
6. Avoid hardcoding a particular year's data.
7. Keep official competition control with Admin.
8. Keep hidden information genuinely protected server-side.
9. Provide realtime updates during live events.
10. Preserve historical records permanently.

The new system should improve the old GCL rather than remove its functionality.

---

# 3. IMPORTANT CHANGE FROM PREVIOUS GCL

## Auction Authority

The Team Leader must NOT have bidding controls.

There must be NO:

- Bid button
- Increase Bid button
- Custom Bid button
- SOLD button
- UNSOLD button
- Winning-team confirmation button

on the Team Leader interface.

The complete official auction is controlled by Admin.

Admin controls:

- Current auction item
- Winning team
- Bid amount
- Bid increment
- Timer
- Answer evaluation
- Correct / Incorrect result
- SOLD / UNSOLD
- Budget deduction
- Score update
- Roster/item assignment
- Corrections
- Undo
- Auction progression

Teams only observe the information that they are permitted to see.

---

# 4. USER ROLES

The platform has three primary roles.

## 4.1 Public Visitor

Unauthenticated visitor.

Can access:

- Landing page
- Current edition
- Previous editions
- Schedule
- Rules
- Teams
- Public leaderboard
- Results
- Champions
- Hall of Fame
- Announcements
- Gallery
- Organizers
- Certificates verification

---

## 4.2 Team Leader

One Team Leader represents one team.

Only the Team Leader gets an account.

Team members DO NOT receive individual accounts.

Team members are stored as team records.

Team Leader can access only the team assigned to their account.

---

## 4.3 Admin / Organizer

Full event authority.

Admin can control:

- Editions
- Teams
- Team Leaders
- Team members
- Rounds
- Questions
- Timers
- Scoring
- Auction
- Budgets
- Transactions
- Results
- Tie breakers
- Winner reveal
- Certificates
- Announcements
- Gallery
- Organizers
- Analytics
- Audit logs
- Event state

---

# 5. TEAM AUTHENTICATION MODEL

## Rule

One team = one Team Leader account.

Example:

Team Alpha
- Team Leader: login account
- Member 1: record only
- Member 2: record only
- Member 3: record only
- Member 4: record only

Members do not receive:

- Login
- Password
- Dashboard
- Quiz account
- Auction account
- Individual score dashboard

---

# 6. TEAM LEADER ACCOUNT

Team Leader account contains:

- Name
- Email
- Team ID
- Team name
- Edition
- Account status
- Login status
- Last login

Team Leader cannot change:

- Team ID
- Assigned edition
- Official team score
- Official budget
- Official auction transactions
- Official results

All official values are controlled by the backend/Admin.

---

# 7. EDITION SYSTEM

The system must be edition-based.

Example:

GCL 2026
GCL 2027
GCL 2028

Each edition is an independent competition.

Edition fields:

- Edition ID
- Edition name
- Year
- Description
- Logo
- Banner
- Start date
- End date
- Registration start
- Registration end
- Status
- Rules
- Theme/content
- Winner
- Champion
- Publication status

Edition statuses:

- DRAFT
- REGISTRATION_OPEN
- REGISTRATION_CLOSED
- UPCOMING
- LIVE
- INTERMISSION
- COMPLETED
- ARCHIVED

---

# 8. CREATE NEW EDITION

Admin can create a new edition without developer involvement.

Admin selects:

CREATE NEW EDITION

Then enters:

- Edition name
- Year
- Dates
- Rules
- Registration configuration
- Number of teams
- Number of rounds
- Starting budget
- Scoring configuration
- Auction configuration

---

# 9. DUPLICATE PREVIOUS EDITION

Admin should be able to duplicate an existing edition.

Example:

Duplicate GCL 2026

Creates:

GCL 2027

Copy:

- Round structure
- Question structure
- Auction configuration
- Scoring configuration
- Rules
- Schedule templates
- Certificate templates
- Public page structure

Do NOT copy:

- Previous scores
- Previous transactions
- Previous budgets
- Previous winner status
- Previous team accounts
- Previous live state

Admin must review the duplicated edition before publishing.

---

# 10. PUBLIC LANDING PAGE

The landing page must represent GCL as a permanent league.

Required sections:

- GCL branding
- Current edition
- Upcoming event
- Live status
- Previous editions
- Competition journey
- Featured teams
- Latest announcements
- Champions
- Statistics
- Gallery
- Organizers
- Rules
- Schedule
- Certificate verification
- Footer

---

# 11. CURRENT EDITION PAGE

The current edition page must show:

- Edition name
- Edition year
- Event status
- Schedule
- Teams
- Rounds
- Rules
- Live competition status
- Leaderboard when allowed
- Announcements
- Gallery
- Results

---

# 12. LIVE EVENT SYSTEM

During a live event, the platform must have a realtime event state.

Possible states:

- NOT_STARTED
- LIVE
- PAUSED
- INTERMISSION
- TIE_BREAKER
- FINAL_REVEAL
- COMPLETED

All connected screens should update automatically.

---

# 13. EVENT CONFIGURATION

Admin configuration screen must include:

## General

- Event name
- Edition
- Number of teams
- Starting budget
- Event status

## Teams

- Team list
- Add team
- Remove team
- Edit team
- Team status

## Rounds

- Round list
- Round order
- Round type
- Round status
- Round duration

## Scoring

- Correct points
- Incorrect points
- Negative marking
- Qualification rules

## Auction

- Base price
- Bid increment
- Timer duration
- Starting budget
- Auction order

---

# 14. TEAM MANAGEMENT

Admin can:

- Add team
- Edit team
- Remove team
- Activate team
- Disable team
- Disqualify team
- Assign Team Leader
- Add members
- Edit members
- Remove members

Team status:

- DRAFT
- REGISTERED
- APPROVED
- ACTIVE
- QUALIFIED
- ELIMINATED
- FINALIST
- WINNER
- DISQUALIFIED

---

# 15. TEAM INFORMATION

Team fields:

- Team ID
- Team name
- Team logo
- Team Leader
- Members
- College
- Department
- Edition
- Starting budget
- Remaining budget
- Total spent
- Score
- Rank
- Status

---

# 16. TEAM MEMBERS

Members are records only.

Fields may include:

- Full name
- USN / Participant ID
- Email
- Phone
- College
- Department
- Semester
- Profile information

Members do not authenticate.

---

# 17. ROUND SYSTEM

Every edition can contain multiple rounds.

Round fields:

- Round ID
- Edition ID
- Round number
- Round name
- Description
- Type
- Duration
- Number of questions
- Scoring configuration
- Qualification configuration
- Status
- Start time
- End time

Round types:

- Quiz
- Coding
- Auction
- Special Challenge
- Final
- Tie Breaker

---

# 18. ROUND STATES

Each round can be:

- DRAFT
- UPCOMING
- LIVE
- PAUSED
- INTERMISSION
- COMPLETED
- LOCKED

---

# 19. PREVIOUS GCL ROUND WORKFLOW

The previous workflow must be preserved.

Typical flow:

SETUP
↓
ROUND START
↓
QUESTION
↓
TIMER
↓
ANSWER
↓
CORRECT / INCORRECT
↓
SCORE UPDATE
↓
NEXT QUESTION
↓
ROUND SUMMARY
↓
INTERMISSION
↓
NEXT ROUND
↓
FINAL RESULTS
↓
TIE BREAKER IF REQUIRED
↓
WINNER REVEAL
↓
EVENT COMPLETION

---

# 20. QUESTION SYSTEM

Admin can create:

- Question
- Options
- Correct answer
- Points
- Incorrect points
- Round
- Question number
- Difficulty
- Explanation
- Status

Question types:

- MCQ
- True/False
- Multiple answer
- Special challenge
- Configurable future types

---

# 21. QUESTION SECURITY

Correct answers must NEVER be sent to Team Leader clients before evaluation.

Correct answers must remain protected by:

- Server-side validation
- Supabase RLS
- Secure backend operations
- Admin-only access

Frontend hiding is NOT considered security.

---

# 22. QUESTION PROGRESSION

Admin can:

- Select question
- Start question
- Reveal question
- Start timer
- Pause timer
- Resume timer
- Reset timer
- Evaluate answer
- Move to next question

Question indicator:

Example:

QUESTION 01 / 20

QUESTION 02 / 20

QUESTION 03 / 20

---

# 23. QUESTION TIMER

Timer must be server-authoritative.

Admin controls:

- Start
- Pause
- Resume
- Reset
- End

Timer must synchronize across all connected screens.

---

# 24. TEAM ANSWER FLOW

Team Leader sees:

- Current question
- Options
- Timer
- Team identity
- Allowed answer interface

Team Leader submits answer.

System stores:

- Team
- Question
- Answer
- Submission time
- Round
- Edition
- Status

---

# 25. ANSWER EVALUATION

The official result must be calculated securely.

Admin should see:

CORRECT (+ configured points)

or

INCORRECT (+ configured points)

Example:

Correct: +1

Incorrect: 0

Negative marking may also be configured.

---

# 26. SCORING ENGINE

Scoring must be configurable per round.

Example:

Correct = +1
Incorrect = 0

Alternative:

Correct = +5
Incorrect = -1

The system must calculate scores server-side.

---

# 27. LIVE ANSWER RESULT

After Admin confirms evaluation:

Team score updates.

Example:

Team Alpha

Previous Score: 8

Correct: +1

New Score: 9

The result must propagate realtime.

---

# 28. SCORE VISIBILITY

Admin has complete score visibility.

Team Leaders only see information permitted by the event configuration.

Public leaderboard visibility can be configured as:

- HIDDEN
- LIVE
- PUBLISHED
- FINAL

---

# 29. QUALIFICATION SYSTEM

Admin can configure qualification based on:

- Score
- Rank
- Number of teams
- Percentage
- Custom criteria

Example:

Top 4 teams qualify.

---

# 30. QUALIFICATION REVEAL

Admin can keep qualification hidden.

When ready:

REVEAL QUALIFIED TEAMS

The system then publishes the qualified teams.

---

# 31. TIE DETECTION

The system must automatically detect ties.

Example:

Team Alpha — 10
Team Beta — 10

The system displays:

TIE DETECTED

Admin can start a tie breaker.

---

# 32. TIE BREAKER

Admin can:

- Start tie breaker
- Select question
- Set timer
- Evaluate answers
- Update score
- Recalculate ranking

Tie breaker results must be recorded separately.

---

# 33. AUCTION SYSTEM

Auction is a core GCL feature.

The auction can contain items/players/challenges depending on the edition configuration.

Each auction item contains:

- Item ID
- Name
- Image
- Description
- Skills/category
- Base price
- Current bid
- Status
- Auction order
- Assigned team
- Final price

---

# 34. AUCTION ITEM STATES

- AVAILABLE
- LIVE
- SOLD
- UNSOLD
- WITHDRAWN

---

# 35. AUCTION CONFIGURATION

Admin can configure:

- Starting budget
- Base price
- Bid increment
- Timer
- Auction order
- Maximum teams
- Eligible teams
- Scoring rules
- Item rules

Nothing should be hardcoded.

Example configuration:

Starting Budget:
₹5 Crore

Base Price:
₹20 Lakh

Bid Increment:
₹10 Lakh

Timer:
3 Minutes

These are configuration examples, not permanent values.

---

# 36. AUCTION ADMIN CONSOLE

The Admin Auction Console is the main auction control center.

It must show:

## Current Item

- Item name
- Image
- Description
- Base price
- Current bid
- Status

## Timer

- Time remaining
- Start
- Pause
- Resume
- Reset

## Teams

- Team list
- Budget
- Eligibility
- Current status

## Bid Controls

Admin can:

- Select winning team
- Enter bid amount
- Increase bid
- Enter custom bid
- Confirm final bid

---

# 37. NO TEAM BIDDING

Team Leader interface must NOT contain:

- Bid button
- Bid increment button
- Custom bid
- Bid confirmation
- SOLD button
- UNSOLD button

Team Leaders cannot officially submit bids.

---

# 38. AUCTION TEAM VIEW

Team Leader can view permitted live information.

Possible information:

- Current item
- Current bid
- Current auction status
- Timer
- Team budget
- Team roster
- Team score

Visibility must be configurable.

Team Leader cannot change official auction data.

---

# 39. AUCTION BID VALIDATION

Before Admin confirms a transaction, the backend must validate:

- Auction is LIVE
- Item is available
- Team is eligible
- Team is not disqualified
- Bid is valid
- Bid meets minimum amount
- Team has sufficient budget
- Item has not already been sold

---

# 40. OFFICIAL AUCTION FLOW

Admin selects:

1. Current item
2. Winning team
3. Final bid
4. Answer/result
5. SOLD or UNSOLD

Then Admin confirms.

---

# 41. AUCTION SOLD FLOW

Example:

Team Alpha

Current budget:
₹5 Crore

Final bid:
₹20 Lakh

Admin confirms SOLD.

System automatically:

- Deducts ₹20 Lakh
- Updates remaining budget
- Assigns item to Team Alpha
- Updates roster
- Records transaction
- Updates score if applicable
- Updates statistics
- Updates leaderboard
- Creates audit record

---

# 42. AUCTION ANSWER SCORING

Auction transactions may also have answer/result scoring.

Example:

Final bid:
₹20 Lakh

Result:
CORRECT

Score:
+1

System performs two independent updates:

Budget:
-₹20 Lakh

Score:
+1

If:

INCORRECT

Budget:
-₹20 Lakh

Score:
Configured incorrect points

Purchase and scoring must remain separate calculations.

---

# 43. UNSOLD FLOW

Admin can mark an item UNSOLD.

System:

- Does not deduct budget
- Does not assign item
- Records UNSOLD status
- Moves to next item when confirmed
- Stores audit record

---

# 44. AUCTION TIMER

Timer is server-controlled.

Admin can:

- Start
- Pause
- Resume
- Reset
- End

Team screens update automatically.

---

# 45. AUCTION CORRECTION

Admin can correct a transaction.

Correction may change:

- Winning team
- Bid amount
- Item assignment
- Budget
- Score
- Result

Corrections must:

1. Recalculate affected values.
2. Restore previous state where required.
3. Apply corrected state.
4. Create an audit record.

No correction should silently delete history.

---

# 46. AUCTION UNDO

Admin can undo the last valid auction transaction when permitted.

Undo must:

- Reverse budget deduction
- Reverse item assignment
- Reverse score changes
- Restore previous item state
- Create an audit log

---

# 47. AUCTION TRANSACTION RECORD

Every transaction stores:

- Transaction ID
- Edition
- Round
- Auction
- Item
- Team
- Final bid
- Result
- Score change
- Budget change
- Timestamp
- Admin/operator
- Status
- Correction history

---

# 48. LIVE TEAM STATUS

The live screen must show team status.

Example:

TEAM ALPHA
Score: 10
Spent: ₹80 Lakh
Budget Left: ₹4.20 Crore

TEAM BETA
Score: 8
Spent: ₹1 Crore
Budget Left: ₹4 Crore

The exact visibility can be configured.

---

# 49. LIVE COMPETITION SCREEN

The live screen is designed for:

- Event hall projector
- Large display
- Streaming
- Public audience

It should show:

- GCL branding
- Current round
- Current question/item
- Timer
- Current bid where applicable
- Team status
- Current standings where allowed
- Event status

---

# 50. ROUND SUMMARY

At the end of a round, generate a Round Summary.

The summary should include:

- Rank
- Team
- Score
- Items
- Total spent
- Budget remaining
- Qualification status

Example:

| Rank | Team | Score | Items | Spent | Budget Left |
|------|------|-------|-------|-------|-------------|
| 1 | Team Alpha | 20 | 3 | ₹80L | ₹4.20Cr |
| 2 | Team Beta | 18 | 2 | ₹60L | ₹4.40Cr |
| 3 | Team Gamma | 15 | 2 | ₹50L | ₹4.50Cr |

---

# 51. INTERMISSION

Intermission is a formal event state.

When Admin starts intermission:

- Live competition stops
- Timer stops
- Team management becomes available
- Round summary remains visible
- Admin can prepare the next round
- Admin can perform permitted corrections
- Admin can start tie breaker
- Admin can continue to next round

---

# 52. INTERMISSION CONTROLS

Admin may see:

- Next Round
- Team Management
- Round Summary
- Start Tie Breaker
- Continue Event
- End Event

---

# 53. FINAL STANDINGS

At the end of all rounds:

System calculates:

- Final score
- Rank
- Total items
- Total spent
- Remaining budget
- Tie status
- Qualification status

Final results become locked after Admin confirmation.

---

# 54. FINAL STATISTICS

Final statistics page should show:

- Rank
- Team
- Score
- Items
- Total spent
- Remaining budget

Additional statistics may include:

- Correct answers
- Incorrect answers
- Auction purchases
- Highest purchase
- Number of transactions
- Round-wise score
- Round-wise rank

---

# 55. WINNER REVEAL

Winner reveal is a dedicated event state.

The final podium must initially remain hidden.

Example:

2ND PLACE
HIDDEN

CHAMPION
HIDDEN

3RD PLACE
HIDDEN

---

# 56. WINNER REVEAL ADMIN CONTROL

Admin selects:

- 3rd Place
- 2nd Place
- Champion

Admin can reveal positions individually.

Example controls:

REVEAL 3RD PLACE

REVEAL 2ND PLACE

REVEAL CHAMPION

---

# 57. CHAMPIONS SCREEN

The public/live screen must provide a dedicated Champions experience.

Header:

CHAMPIONS

Subtitle:

GCL [EDITION]

Podium:

                 CHAMPION
                    1

          2ND                 3RD

Each podium position displays:

- Team name
- Team logo
- Score
- Position

The Champion should receive the primary visual focus.

---

# 58. PODIUM REVEAL

The reveal should support an event-style presentation.

Possible sequence:

1. Hide all positions.
2. Reveal 3rd place.
3. Reveal 2nd place.
4. Reveal Champion.
5. Show final standings.
6. Show celebration state.

The Admin controls the reveal.

---

# 59. CHAMPION RECORD

When the Champion is confirmed:

Store:

- Edition
- Team
- Team members
- Final score
- Rank
- Winning date
- Final statistics
- Certificate eligibility

This becomes permanent historical data.

---

# 60. END EVENT

Admin can end the edition.

Before ending:

System should require confirmation.

After completion:

- Results are locked
- Champion is stored
- Final standings are stored
- Transactions remain accessible
- Audit history remains accessible
- Certificates become available
- Edition can be archived

---

# 61. DO NOT DELETE COMPLETED EDITIONS

Completed editions must remain available as historical records.

Example:

GCL 2026
GCL 2027
GCL 2028

Users can browse previous editions.

---

# 62. PREVIOUS EDITIONS

Public page should show:

- Edition
- Champion
- Final standings
- Statistics
- Gallery
- Schedule
- Rules
- Results

---

# 63. HALL OF FAME

Hall of Fame should show previous champions.

Each record:

- Edition
- Champion team
- Team logo
- Score
- Members
- Date

---

# 64. LEADERBOARD

Leaderboard supports:

- Live leaderboard
- Round leaderboard
- Final leaderboard
- Historical leaderboard

Admin can control publication state.

---

# 65. ADMIN SCOREBOARD

Admin sees full internal data.

Admin scoreboard includes:

- All teams
- Score
- Budget
- Spent
- Items
- Rank
- Correct answers
- Incorrect answers
- Qualification
- Status

---

# 66. TEAM LEADER DASHBOARD

Team Leader dashboard contains:

- Team identity
- Team logo
- Team members
- Current round
- Current question
- Timer
- Team score
- Budget
- Spent amount
- Purchased items
- Team status
- Announcements

No bidding controls.

---

# 67. TEAM DATA ISOLATION

A Team Leader must only access their own team's data.

Team Leader A cannot access:

- Team B account
- Team B private information
- Team B hidden data
- Team B private answers
- Team B credentials

RLS must enforce this at database level.

---

# 68. ADMIN DASHBOARD

Admin dashboard should provide:

- Current edition
- Event status
- Number of teams
- Current round
- Current question
- Timer
- Total score
- Auction status
- Budget statistics
- Recent transactions
- Qualification status
- Tie status
- Quick controls

---

# 69. ADMIN NAVIGATION

Recommended sections:

- Dashboard
- Editions
- Teams
- Team Leaders
- Members
- Rounds
- Questions
- Live Control
- Auction
- Scoreboard
- Results
- Winner Reveal
- Certificates
- Announcements
- Gallery
- Organizers
- Analytics
- Audit Logs
- Settings

---

# 70. ADMIN LIVE CONTROL

Live Control should combine the most important event controls.

Admin can access:

## Event

- Start
- Pause
- Resume
- Intermission
- End

## Round

- Start
- Pause
- Complete
- Next

## Question

- Select
- Reveal
- Timer
- Evaluate
- Next

## Auction

- Select item
- Select team
- Set bid
- Confirm
- SOLD
- UNSOLD
- Undo
- Correction

## Results

- Reveal
- Tie breaker
- Finalize
- Champion reveal

---

# 71. ANNOUNCEMENT SYSTEM

Admin can create announcements.

Fields:

- Title
- Description
- Image
- Edition
- Date
- Priority
- Status

Announcements can appear on:

- Home
- Edition page
- Team dashboard

---

# 72. SCHEDULE

Schedule supports:

- Registration
- Opening
- Round 1
- Round 2
- Auction
- Intermission
- Final
- Winner reveal
- Closing ceremony

Each schedule item:

- Title
- Date
- Start time
- End time
- Description
- Status

---

# 73. RULES

Rules must be configurable per edition.

Categories:

- Registration rules
- Team rules
- Round rules
- Quiz rules
- Scoring rules
- Auction rules
- Tie-breaker rules
- Disqualification rules
- Final result rules

---

# 74. GALLERY

Admin can upload:

- Event photos
- Videos
- Posters
- Team photos
- Champion photos

Gallery can be filtered by edition.

---

# 75. ORGANIZERS

Organizer page can contain:

- Director
- Coordinator
- Faculty coordinators
- Student coordinators
- Technical team
- Event team

Fields:

- Name
- Role
- Photo
- Department
- Contact information if required

---

# 76. CERTIFICATE SYSTEM

System should support certificates for:

- Participants
- Team Leaders
- Winners
- Organizers
- Special awards

Certificate configuration must be edition-specific.

---

# 77. CERTIFICATE GENERATION

Admin can generate certificates automatically.

Certificate contains:

- Participant name
- Team
- Edition
- Award
- Certificate ID
- Date
- Organizer signature
- QR verification

---

# 78. CERTIFICATE VERIFICATION

Public verification page:

/verify/[certificate-id]

Shows:

- Certificate ID
- Name
- Team
- Edition
- Award
- Issue date
- Verification status

---

# 79. QR VERIFICATION

Each certificate can contain a QR code.

QR points to:

GCL certificate verification page.

---

# 80. ANALYTICS

Admin analytics should include:

## Team analytics

- Total teams
- Active teams
- Eliminated teams
- Finalists
- Champion

## Score analytics

- Highest score
- Average score
- Round-wise score
- Correct answers
- Incorrect answers

## Auction analytics

- Total auction items
- Sold items
- Unsold items
- Total spending
- Highest bid
- Average bid
- Team spending

## Event analytics

- Round duration
- Participation
- Activity
- Transaction count

---

# 81. AUDIT LOG

Every important Admin action must be recorded.

Examples:

- Team created
- Team edited
- Question created
- Question revealed
- Score changed
- Bid created
- Auction sold
- Auction corrected
- Auction undone
- Team disqualified
- Tie breaker started
- Result revealed
- Champion confirmed

Audit record:

- Action
- User
- Timestamp
- Edition
- Entity
- Previous value
- New value

---

# 82. REALTIME SYSTEM

Realtime updates are required for live competition.

Realtime events include:

- Question changes
- Timer changes
- Score changes
- Auction changes
- Team status
- Budget changes
- Round changes
- Intermission
- Tie breaker
- Winner reveal

---

# 83. SERVER-AUTHORITATIVE TIMER

Timer must NOT depend only on the browser.

Store:

- Start time
- End time
- Pause time
- Remaining time
- State

Clients calculate/display remaining time based on server state.

---

# 84. SECURITY

Use:

- Supabase Auth
- Row Level Security
- Secure database functions
- Server-side scoring
- Server-side auction validation
- Protected Admin routes
- Protected Team Leader routes
- Role checks
- Edition-level authorization

---

# 85. IMPORTANT SECURITY RULE

Never trust frontend values for:

- Score
- Budget
- Bid
- Winning team
- Correct answer
- Rank
- Qualification
- Certificate status

All official values must be calculated or validated server-side.

---

# 86. ADMIN SECURITY

Admin operations require authorization.

Sensitive operations include:

- Changing scores
- Auction confirmation
- Budget correction
- Result finalization
- Champion selection
- Winner reveal
- Event completion

---

# 87. DATABASE STRUCTURE

Recommended tables:

## editions

- id
- name
- year
- description
- status
- start_date
- end_date
- created_at

## teams

- id
- edition_id
- team_id
- name
- logo
- leader_id
- status
- starting_budget
- remaining_budget
- total_spent
- score

## team_members

- id
- team_id
- name
- participant_id
- email
- phone
- college
- department
- semester

## profiles

- id
- auth_user_id
- role
- name
- email

## rounds

- id
- edition_id
- name
- round_number
- type
- status
- duration
- scoring_config

## questions

- id
- round_id
- question_number
- question
- options
- correct_answer
- points
- incorrect_points
- status

## submissions

- id
- question_id
- team_id
- answer
- submitted_at
- evaluation_status
- points_awarded

## auction_items

- id
- edition_id
- round_id
- name
- description
- image
- base_price
- status
- auction_order

## auction_transactions

- id
- item_id
- team_id
- bid_amount
- result
- score_change
- budget_change
- admin_id
- created_at

## team_roster

- id
- team_id
- item_id
- purchase_price

## scores

- id
- edition_id
- team_id
- round_id
- points
- source
- created_at

## announcements

## gallery

## schedules

## organizers

## certificates

## audit_logs

## winner_reveals

## tie_breakers

---

# 88. SCORE CALCULATION

Score should have a traceable source.

Example:

TEAM ALPHA

Round 1:

Q1 Correct = +1
Q2 Correct = +1
Q3 Incorrect = 0

Round Score = 2

Auction:

Correct = +1

Total Score = 3

Every score change must be traceable.

---

# 89. BUDGET CALCULATION

Budget:

Starting Budget
-
Total Purchases
=
Remaining Budget

Example:

Starting Budget:
₹5 Crore

Purchase:
₹20 Lakh

Remaining:
₹4.80 Crore

Corrections must recalculate the budget correctly.

---

# 90. RANK CALCULATION

Ranking should be calculated from official scores.

If two teams have the same score:

Tie-breaker rules are applied.

Admin can trigger tie breaker.

Final ranking is locked after Admin finalization.

---

# 91. EVENT STATES

The complete event lifecycle:

DRAFT
↓
REGISTRATION
↓
READY
↓
LIVE
↓
ROUND
↓
INTERMISSION
↓
NEXT ROUND
↓
FINAL
↓
TIE BREAKER
↓
FINAL STANDINGS
↓
WINNER REVEAL
↓
COMPLETED
↓
ARCHIVED

---

# 92. ERROR HANDLING

System must handle:

- Timer expired
- Duplicate submission
- Duplicate transaction
- Insufficient budget
- Invalid bid
- Team disqualified
- Auction already closed
- Question already completed
- Network interruption
- Admin refresh
- Browser refresh
- Realtime disconnect

---

# 93. NETWORK INTERRUPTION

If connection is lost:

- Server state remains authoritative.
- Client reconnects.
- Current event state is restored.
- Timer synchronizes.
- Score synchronizes.
- Auction state synchronizes.

No important state should exist only in browser memory.

---

# 94. MOBILE RESPONSIVENESS

Public pages must work on:

- Mobile
- Tablet
- Laptop
- Desktop

Admin dashboard should also be usable on smaller screens, while prioritizing desktop for live event operation.

---

# 95. LIVE DISPLAY RESPONSIVENESS

Live competition screen must work especially well on:

- Projectors
- Large displays
- Event hall screens
- Streaming layouts

Important information should remain readable from distance.

---

# 96. ACCESSIBILITY

Support:

- Keyboard navigation
- Proper contrast
- Accessible buttons
- Semantic HTML
- Screen-reader friendly labels
- Clear focus states
- Reduced-motion consideration

---

# 97. PERFORMANCE

Live screens must update quickly.

Optimize:

- Realtime subscriptions
- Database queries
- Images
- Large team lists
- Leaderboards
- Auction updates

Avoid unnecessary page reloads.

---

# 98. SEO

Public pages should have:

- Proper titles
- Meta descriptions
- Open Graph metadata
- Structured URLs
- Edition-specific metadata

Admin and Team Leader dashboards should not be indexed.

---

# 99. PUBLIC URL STRUCTURE

Example:

/
 
/edition

/edition/2026

/edition/2026/teams

/edition/2026/rounds

/edition/2026/results

/edition/2026/champions

/edition/2026/rules

/edition/2026/schedule

/edition/2026/gallery

/hall-of-fame

/certificates/verify/[id]

---

# 100. TEAM LEADER URL STRUCTURE

/team/login

/team/dashboard

/team/competition

/team/round

/team/results

/team/roster

/team/profile

---

# 101. ADMIN URL STRUCTURE

/admin/login

/admin/dashboard

/admin/editions

/admin/teams

/admin/members

/admin/rounds

/admin/questions

/admin/live

/admin/auction

/admin/scoreboard

/admin/results

/admin/tie-breaker

/admin/winner-reveal

/admin/certificates

/admin/announcements

/admin/gallery

/admin/analytics

/admin/audit-logs

/admin/settings

---

# 102. TEAM LEADER USER JOURNEY

1. Team Leader opens login.
2. Logs in.
3. System identifies assigned team.
4. Team dashboard opens.
5. Team Leader sees current event status.
6. When round starts, current question appears.
7. Timer starts.
8. Team Leader submits answer.
9. Admin evaluates result.
10. Score updates.
11. Next question appears.
12. Team sees round summary when published.
13. Team continues through subsequent rounds.
14. Team sees final result when published.

---

# 103. ADMIN USER JOURNEY

1. Admin logs in.
2. Selects edition.
3. Opens event control.
4. Configures teams.
5. Starts event.
6. Starts round.
7. Selects question.
8. Starts timer.
9. Receives answer.
10. Evaluates answer.
11. Score updates.
12. Moves to next question.
13. Completes round.
14. Shows round summary.
15. Starts intermission.
16. Prepares next round.
17. Runs auction where applicable.
18. Controls all auction transactions.
19. Detects tie if necessary.
20. Starts tie breaker.
21. Finalizes standings.
22. Opens winner reveal.
23. Selects podium positions.
24. Reveals 3rd place.
25. Reveals 2nd place.
26. Reveals Champion.
27. Completes edition.
28. Generates certificates.
29. Archives edition.

---

# 104. PREVIOUS GCL FEATURE PRESERVATION REQUIREMENT

The following previous-year features must NOT be removed:

- Event configuration
- Team management
- Team status
- Round management
- Question progression
- Question number tracking
- Timer
- Answer evaluation
- Correct/Incorrect scoring
- Live team status
- Auction
- Final bid control
- Budget tracking
- Item assignment
- Auction transaction history
- Corrections
- Intermission
- Round summary
- Tie breaker
- Final statistics
- Final standings
- Hidden podium
- Winner reveal
- Champions screen
- Event completion
- Admin controls

The new platform should improve these features instead of replacing them with unrelated workflows.

---

# 105. FEATURES THAT MUST NOT BE ADDED TO TEAM LEADER

Do NOT create:

- Team member login
- Individual participant dashboard
- Team-side bidding
- Team-side SOLD confirmation
- Team-side budget editing
- Team-side score editing
- Team-side result confirmation
- Team-side winner selection

---

# 106. ADMIN OFFICIAL AUTHORITY

Admin is the final authority for:

- Event state
- Round state
- Question progression
- Answer evaluation
- Scoring confirmation
- Auction
- Winning team selection
- Bid amount
- SOLD / UNSOLD
- Corrections
- Tie breaker
- Final standings
- Winner reveal
- Champion confirmation
- Event completion

---

# 107. PUBLIC VISIBILITY CONTROL

Every important result should have a visibility setting.

Examples:

- Hidden
- Admin only
- Team only
- Live
- Public
- Final

This prevents accidental exposure of confidential information.

---

# 108. HIDDEN DATA REQUIREMENT

The following must remain private until officially revealed:

- Correct answers
- Unpublished scores
- Qualification results
- Hidden leaderboard
- Champion selection
- Hidden podium
- Internal Admin notes

Frontend CSS/JavaScript hiding is not sufficient.

---

# 109. RESULT LOCKING

Once Admin finalizes:

- Round result
- Auction result
- Tie-breaker result
- Final standings
- Champion

the result should become locked.

Changes afterward require an authorized correction flow and audit log.

---

# 110. AUDITABLE COMPETITION

Every official result must be explainable.

For a team score, Admin should be able to trace:

Score
→ Round
→ Question
→ Answer
→ Evaluation
→ Points

For auction:

Item
→ Team
→ Bid
→ Result
→ Budget change
→ Score change
→ Transaction
→ Admin

---

# 111. FUTURE EDITION SUPPORT

The architecture must allow future GCL editions without code changes for normal event operations.

Admin should be able to create:

GCL 2027

without developer changes.

The same system must continue supporting:

GCL 2026
GCL 2027
GCL 2028
GCL 2029
...

---

# 112. FUTURE FEATURES

Architecture should leave room for:

- Coding rounds
- Automated coding evaluation
- More question types
- Advanced anti-cheating
- QR attendance
- Team analytics
- Public APIs
- Streaming overlays
- Live audience interaction
- Sponsor management
- Event registration payments
- Advanced certificates
- Multi-stage tournaments

These should not complicate the initial core implementation.

---

# 113. DESIGN DIRECTION

The product should feel like:

Competitive technology league
+
Professional event platform
+
Live tournament system

It should NOT look like:

- Generic dashboard template
- Generic AI website
- Generic college CRUD application
- Generic quiz app
- Generic auction marketplace

The design should have a strong GCL identity.

---

# 114. DESIGN PRINCIPLES

Prioritize:

- Strong visual hierarchy
- Competition atmosphere
- Clear live-state indicators
- Fast admin interaction
- Large readable live information
- Professional cards
- Clear score presentation
- Strong podium/winner presentation
- Consistent GCL branding
- Responsive layouts

---

# 115. ADMIN UX PRINCIPLE

Admin should be able to operate the entire live event without navigating through complicated menus.

The Live Control / Admin Console should prioritize:

CURRENT STATE
↓
CURRENT ACTION
↓
CONFIRMATION
↓
NEXT ACTION

---

# 116. LIVE EVENT SAFETY

Destructive actions require confirmation.

Examples:

- Delete team
- Disqualify team
- Undo transaction
- Correct transaction
- End round
- End event
- Finalize results
- Reveal champion

---

# 117. CONFIRMATION EXAMPLE

Before confirming SOLD:

Current Item:
[Item Name]

Winning Team:
[Team Alpha]

Final Bid:
₹20 Lakh

Budget After Purchase:
₹4.80 Crore

Result:
CORRECT +1

[ CANCEL ]

[ CONFIRM SOLD ]

---

# 118. FINAL EVENT CONTROL

Admin should have:

PAUSE EVENT

RESUME EVENT

INTERMISSION

START TIE BREAKER

FINALIZE RESULTS

START WINNER REVEAL

END EDITION

---

# 119. ACCEPTANCE CRITERIA

The platform is considered functionally complete when:

## Authentication

- Team Leader can log in.
- Team Leader only sees their team.
- Admin can log in.
- Members do not have login accounts.

## Event

- Admin can create edition.
- Admin can configure event.
- Admin can manage teams.
- Admin can start/pause/end event.

## Rounds

- Admin can create rounds.
- Admin can start rounds.
- Admin can control questions.
- Timer works.
- Round summary works.

## Scoring

- Correct answer adds configured points.
- Incorrect answer applies configured points.
- Score is calculated server-side.
- Score history is traceable.

## Auction

- Admin controls auction.
- Admin selects team.
- Admin sets bid.
- Team Leader cannot bid.
- Budget is validated server-side.
- SOLD works.
- UNSOLD works.
- Budget updates correctly.
- Item assignment works.
- Score updates correctly.
- Undo works.
- Correction works.

## Intermission

- Event can enter intermission.
- Round summary remains available.
- Admin can prepare next stage.

## Tie Breaker

- Ties are detected.
- Admin can start tie breaker.
- Tie-breaker score updates ranking.

## Results

- Final statistics are generated.
- Final ranking is generated.
- Results can be locked.

## Winner Reveal

- Podium starts hidden.
- Admin selects 3rd place.
- Admin selects 2nd place.
- Admin selects Champion.
- Admin can reveal positions.
- Champions screen displays final result.

## Permanent Platform

- Multiple editions work independently.
- Previous editions remain accessible.
- Historical champions remain stored.
- Completed editions are not deleted.

---

# 120. FINAL PRODUCT DEFINITION

GCL is not just a website.

It is a permanent competition operating system for the Gen Code League.

It must support the complete lifecycle:

PLAN
↓
CREATE EDITION
↓
REGISTER / MANAGE TEAMS
↓
CONFIGURE ROUNDS
↓
RUN LIVE COMPETITION
↓
ASK QUESTIONS
↓
EVALUATE ANSWERS
↓
UPDATE SCORES
↓
RUN AUCTION
↓
MANAGE BUDGETS
↓
COMPLETE ROUNDS
↓
INTERMISSION
↓
TIE BREAKER
↓
FINAL STANDINGS
↓
WINNER REVEAL
↓
CHAMPION
↓
CERTIFICATES
↓
ARCHIVE
↓
NEXT EDITION

---

# 121. MOST IMPORTANT BUSINESS RULES

RULE 1:
One team has one Team Leader login.

RULE 2:
Team members do not have individual accounts.

RULE 3:
Team Leaders cannot bid.

RULE 4:
Admin controls all official auction transactions.

RULE 5:
Admin controls official answer evaluation.

RULE 6:
Scores are calculated securely on the server.

RULE 7:
Budgets are calculated securely on the server.

RULE 8:
Correct answers remain private until allowed.

RULE 9:
Hidden results must actually be protected server-side.

RULE 10:
Every correction must be auditable.

RULE 11:
Completed editions must never lose historical data.

RULE 12:
The system must support future editions without rebuilding the application.

RULE 13:
The previous GCL workflow must be preserved unless explicitly changed.

RULE 14:
Winner reveal is an Admin-controlled presentation state.

RULE 15:
Champion selection and final results must be locked after confirmation.

---

# 122. FINAL GCL WORKFLOW

## PRE-EVENT

Admin
→ Create Edition
→ Configure Event
→ Add Teams
→ Add Team Leaders
→ Add Members
→ Configure Rounds
→ Add Questions
→ Configure Scoring
→ Configure Auction

## LIVE ROUND

Admin
→ Start Round
→ Select Question
→ Reveal Question
→ Start Timer

Team Leader
→ View Question
→ Submit Answer

Admin
→ Evaluate Answer
→ Correct / Incorrect
→ Confirm Score

System
→ Update Score
→ Save Result
→ Continue

## AUCTION

Admin
→ Select Item
→ Start Timer
→ Select Winning Team
→ Enter Final Bid
→ Evaluate Result
→ Confirm SOLD / UNSOLD

System
→ Update Budget
→ Update Roster
→ Update Score
→ Save Transaction
→ Save Audit Log

## ROUND END

Admin
→ Complete Round

System
→ Calculate Ranking
→ Generate Round Summary

## INTERMISSION

Admin
→ Start Intermission
→ Review Summary
→ Manage Teams
→ Prepare Next Round

## TIE

System
→ Detect Tie

Admin
→ Start Tie Breaker
→ Run Question
→ Evaluate
→ Update Score
→ Recalculate Ranking

## FINAL

Admin
→ Finalize Results

System
→ Lock Final Standings

Admin
→ Open Winner Reveal
→ Select 3rd
→ Select 2nd
→ Select Champion

## REVEAL

Public Screen
→ Hidden Podium
→ Reveal 3rd
→ Reveal 2nd
→ Reveal Champion
→ Show Final Statistics
→ Show Champions

## POST-EVENT

System
→ Store Champion
→ Generate Certificates
→ Publish Results
→ Archive Edition

---

# 123. FINAL DEVELOPMENT PRINCIPLE

Build GCL as a reusable competition platform, not as a website for one event.

The previous-year GCL workflow is the baseline.

The new version should preserve its competition flow and important features while providing:

- Better UI
- Better UX
- Better security
- Better realtime performance
- Better Admin controls
- Better auditability
- Better result management
- Better winner presentation
- Edition-based architecture
- Long-term scalability

The final product should allow organizers to run the next GCL edition from the same platform without rebuilding the application.

END OF GCL MASTER PRD