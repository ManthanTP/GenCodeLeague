# GEN CODE LEAGUE (GCL)
# MASTER PRODUCT REQUIREMENTS DOCUMENT

Version: 1.0
Product: Gen Code League
Abbreviation: GCL
Product Type: Competitive Coding and Technology League Platform

==================================================
1. PRODUCT OVERVIEW
==================================================

Gen Code League (GCL) is a competitive coding and technology league where teams participate in multiple competitive rounds, including elimination challenges, quizzes, auction/bidding-based gameplay, live competitions, and final rounds.

The GCL platform is not just a website for one event.

It is a permanent digital platform that supports:

- Current GCL editions
- Previous GCL editions
- Future GCL editions
- Team registration
- Participant accounts
- Team management
- Competitive rounds
- Elimination quizzes
- Qualification
- Auction and bidding
- Team budgets
- Live competition
- Leaderboards
- Results
- Certificates
- Announcements
- Gallery
- Organizers
- Analytics
- Historical records

The system must use an edition-based architecture.

Example:

GCL 2025
GCL 2026
GCL 2027
GCL 2028
GCL 2029

The platform must NOT be hardcoded around a single year.

A new GCL edition should be created through the admin panel without rebuilding the application.


==================================================
2. PRODUCT VISION
==================================================

The goal is to build GCL as a permanent competitive technology league.

The platform should combine:

COMPETITIVE CODING
+
SPORTS LEAGUE
+
TECH EVENT
+
PREMIUM DIGITAL PRODUCT

The final product should feel like a real competitive league rather than:

- A generic SaaS website
- A generic college website
- A generic hackathon template
- A generic AI-generated landing page
- A one-time event microsite

The platform should become more valuable every year because each new edition adds:

- Teams
- Participants
- Results
- Champions
- Finalists
- Event photos
- Competition history
- Certificates
- Records


==================================================
3. DESIGN DIRECTION
==================================================

Use the restraint, hierarchy, typography, spacing and product storytelling associated with high-quality Apple marketing pages.

Do NOT copy Apple's design directly.

Create a unique GCL visual identity.

The visual identity should communicate:

- Competition
- Coding
- Strategy
- Teamwork
- Speed
- Skill
- Technology
- Achievement
- League culture
- Campus energy

The design should feel like:

Premium technology event
+
Competitive sports league
+
Coding competition


==================================================
4. LAST YEAR'S GCL AS REFERENCE
==================================================

The previous GCL event design, screenshots and assets should be treated as the primary reference for the event's existing identity.

Before designing:

- Study the previous GCL interface
- Study branding
- Study colors
- Study typography
- Study team presentation
- Study competition presentation
- Study auction/bidding presentation
- Study event atmosphere
- Study visual hierarchy

Do not simply copy the previous website.

The goal is:

LAST YEAR'S GCL
        ↓
EVOLVE
        ↓
PERMANENT GCL PLATFORM

The new product should feel like the next generation of GCL.


==================================================
5. ANTI-AI-SLOP DESIGN RULES
==================================================

Do not use generic AI-generated website patterns.

Avoid:

- Purple and black AI aesthetic
- Neon colors everywhere
- Rainbow gradients
- Generic pastel gradients
- Radial gradient orbs
- Dot-grid backgrounds
- Liquid glass
- Excessive glassmorphism
- Floating glowing objects
- Sparkle icons
- Emoji-based UI
- Random 3D objects
- Decorative terminal windows
- Excessive rounded cards
- Shadows on every element
- Three identical feature cards
- Generic bento grids
- Fake testimonials
- Fake statistics
- Fake sponsors
- Fake customer logos
- Fake awards
- Generic "The future of..." headlines
- Excessive animation
- Animated arrows everywhere
- Excessive parallax
- Decorative elements without purpose

Every visual element must have a reason to exist.


==================================================
6. COLOR SYSTEM
==================================================

Create a distinctive GCL color system.

Use:

- Deep dark foundation where appropriate
- Warm neutral or off-white content sections
- One primary GCL accent
- Restrained supporting colors
- Strong contrast

Do not make every section colorful.

Color should communicate meaning.

Use accent colors for meaningful states such as:

- Active
- Qualified
- Winner
- Live
- Eliminated
- Current leader
- Important actions

Do not use color purely as decoration.


==================================================
7. TYPOGRAPHY
==================================================

Typography must be a major part of GCL's identity.

Do not use:

- Inter
- Geist
- Space Grotesk

Choose a distinctive and highly readable typography system.

Use:

- Strong display typography for major GCL headlines
- Highly readable body typography
- Clear numerical typography for scores
- Clear numerical typography for rankings
- Clear numerical typography for budgets
- Clear numerical typography for bids
- Clear numerical typography for timers

Create a consistent typography scale.


==================================================
8. TECH STACK
==================================================

Preferred frontend:

React
Vite
TypeScript

Backend:

Supabase

Database:

PostgreSQL

Authentication:

Supabase Auth

Storage:

Supabase Storage

Realtime:

Supabase Realtime

Hosting:

Vercel

Use clean CSS/component architecture.

Do not add unnecessary libraries.

Use accessible UI primitives only where useful.

Keep dependencies minimal.


==================================================
9. GLOBAL NAVIGATION
==================================================

Public navigation:

GCL
Home
Current Edition
Rounds
Teams
Leaderboard
Editions
Results
Gallery
Rules

Primary CTA:

JOIN / REGISTER

Depending on the current event state, the CTA may become:

REGISTER NOW
ENTER LEAGUE
VIEW LIVE
VIEW RESULTS

Do not show multiple competing primary CTAs.

Authenticated users should see:

LOGIN
DASHBOARD

Admins should have a separate admin login/access route.


==================================================
10. PUBLIC WEBSITE
==================================================

The public website should include:

Home
About
Current Edition
Editions
Rounds
Teams
Leaderboard
Results
Schedule
Rules
Winners
Gallery
Announcements
Organizers
Contact
Certificate Verification


==================================================
11. HOMEPAGE
==================================================

The homepage should immediately answer:

What is GCL?

Why should I care?

How does the competition work?

What is happening now?

How can I participate?

Who has won?

What happened in previous editions?

Recommended homepage structure:

1. HERO
2. CURRENT EDITION
3. WHAT IS GCL
4. COMPETITION JOURNEY
5. LIVE/CURRENT STATUS
6. TEAMS
7. LEADERBOARD
8. AUCTION/SPECIAL ROUND
9. PREVIOUS EDITIONS
10. HALL OF FAME
11. GALLERY
12. ORGANIZERS
13. FINAL CTA


==================================================
12. HERO SECTION
==================================================

The hero must immediately communicate GCL.

Do not use generic headlines such as:

"The Future of Coding"
"Where Innovation Meets Technology"
"Unleash Your Potential"

Suggested direction:

GEN CODE
LEAGUE

BUILD.
COMPETE.
CLIMB.

Supporting text:

A competitive coding league where teams take on challenges, survive elimination rounds, compete for position, and battle through the league.

Primary CTA:

JOIN THE LEAGUE

Secondary CTA:

EXPLORE GCL

Use actual GCL assets where available.

Possible hero visual:

- Previous GCL event photography
- Competition dashboard
- Leaderboard
- Auction interface
- Team imagery
- Current edition information
- Actual GCL interface

Do not fill the hero with meaningless decorative effects.


==================================================
13. CURRENT EDITION
==================================================

Immediately establish the current GCL edition.

Example:

GCL 2026

REGISTRATION
OPEN / CLOSED

EVENT DATE
[ACTUAL DATE]

VENUE
[ACTUAL VENUE]

STATUS
[ACTUAL STATUS]

ROUND
[CURRENT ROUND]

Never invent event information.

If information is unavailable, use:

[ORGANIZER INPUT REQUIRED]


==================================================
14. EDITION SYSTEM
==================================================

Each edition is independent but belongs to the same GCL platform.

Each edition contains:

- Event details
- Registration
- Participants
- Teams
- Rounds
- Questions
- Quiz
- Qualification
- Auction
- Players/items
- Team budgets
- Bids
- Transactions
- Leaderboard
- Results
- Schedule
- Announcements
- Gallery
- Organizers
- Certificates
- Winners

Example:

GCL 2025
GCL 2026
GCL 2027


==================================================
15. EDITION LIFECYCLE
==================================================

An edition can have the following states:

DRAFT
REGISTRATION_OPEN
REGISTRATION_CLOSED
PRE_EVENT
LIVE
RESULTS_PENDING
RESULTS_PUBLISHED
COMPLETED
ARCHIVED

Only authorized admins can change edition status.


==================================================
16. GCL JOURNEY
==================================================

Show the competition as a progression.

Example:

01 REGISTER
02 ELIMINATION
03 QUALIFICATION
04 AUCTION
05 COMPETITION
06 FINALS
07 CHAMPION

The exact sequence must be configurable per edition.

Do not force every stage into identical cards.

Use an editorial timeline/progression design.

Each stage should support:

- Title
- Description
- Status
- Date
- Rules
- Result


==================================================
17. USER ROLES
==================================================

The platform has four primary roles:

1. PUBLIC VISITOR
2. PARTICIPANT
3. TEAM CAPTAIN
4. ADMIN / ORGANIZER


==================================================
18. PUBLIC VISITOR
==================================================

Public users can:

- View homepage
- View current edition
- View public teams
- View published leaderboard
- View published results
- View rounds
- View rules
- View schedule
- View previous editions
- View winners
- View gallery
- View announcements
- Verify certificates

Public users cannot access:

- Private team data
- Hidden scores
- Admin functions
- Private participant information


==================================================
19. PARTICIPANT
==================================================

Participants can:

- Create/login to account
- View profile
- View team
- View assigned rounds
- Participate in quizzes
- Participate in assigned competitions
- View allowed results
- View announcements

Participants cannot:

- Access another team's private information
- Modify official scores
- Access admin functionality


==================================================
20. TEAM CAPTAIN
==================================================

Team captains can:

- View their team
- View team members
- Access team dashboard
- Participate in team rounds
- Access auction
- View team budget
- View roster
- Generate eligible certificates
- Download certificates
- View certificate history

Team captains cannot:

- Access another team
- Modify official participant information
- Modify scores
- Modify official results
- Generate unauthorized achievements
- Generate certificates for another team
- Modify certificate IDs
- Modify certificate records


==================================================
21. ADMIN
==================================================

Admins have full authorized control over:

- Editions
- Participants
- Teams
- Rounds
- Questions
- Quiz
- Qualification
- Auction
- Players/items
- Budgets
- Bids
- Transactions
- Leaderboard
- Results
- Certificates
- Schedule
- Announcements
- Gallery
- Organizers
- Analytics
- Settings
- Audit logs


==================================================
22. REGISTRATION SYSTEM
==================================================

Registration is available only when registration is open.

Possible fields:

- Full name
- Email
- Phone
- USN / Participant ID
- College
- Department
- Semester
- Profile information

The exact registration fields must be configurable by admin.

Registration states:

NOT_OPEN
OPEN
CLOSED
WAITLIST
COMPLETED


==================================================
23. PARTICIPANT PROFILE
==================================================

Participant profile contains:

- Name
- Email
- Participant ID
- Institution
- Department
- Team
- Role
- Edition
- Participation status

Participants cannot modify official competition information without authorization.


==================================================
24. TEAM SYSTEM
==================================================

A team contains:

- Team ID
- Team name
- Team logo
- Captain
- Members
- Edition
- Status

Team states:

DRAFT
REGISTERED
APPROVED
ACTIVE
QUALIFIED
ELIMINATED
FINALIST
WINNER
DISQUALIFIED


==================================================
25. TEAM DASHBOARD
==================================================

The team dashboard should contain:

OVERVIEW

- Team name
- Team logo
- Edition
- Status
- Current round

TEAM MEMBERS

- Member list
- Captain
- Participation status

COMPETITION

- Current round
- Upcoming round
- Completed rounds

AUCTION

- Current budget
- Roster
- Bids
- Transactions

CERTIFICATES

- Eligible certificates
- Generated certificates
- Certificate history

ANNOUNCEMENTS

- Team-relevant updates


==================================================
26. ROUND SYSTEM
==================================================

Each edition can have multiple rounds.

Each round contains:

- Round ID
- Edition
- Name
- Description
- Type
- Start time
- End time
- Duration
- Rules
- Scoring method
- Qualification method
- Status

Possible round types:

- Quiz
- Coding
- Auction
- Special Challenge
- Final

Round states:

DRAFT
UPCOMING
LIVE
PAUSED
COMPLETED
LOCKED


==================================================
27. ELIMINATION QUIZ
==================================================

GCL supports a timed elimination quiz.

The quiz should support:

- Multiple-choice questions
- Configurable number of questions
- Configurable timer
- Question navigation
- Answer selection
- Auto-save
- Auto-submit
- Time expiration
- Qualification logic
- Tie-breakers
- QR-based joining where implemented
- Anti-cheat/device tracking where implemented


==================================================
28. QUESTION SYSTEM
==================================================

Each question contains:

- Question text
- Options
- Correct answer
- Points
- Round
- Difficulty if required
- Status

Correct answers must never be exposed to participants.


==================================================
29. QUIZ INTERFACE
==================================================

Example:

Question 12 / 20

Question text

Option A
Option B
Option C
Option D

Time Remaining

[Previous]
[Next]

Features:

- Question navigation
- Answer selection
- Auto-save
- Timer
- Auto-submit
- Final submission


==================================================
30. QUIZ SCORING
==================================================

Scoring must be configurable per round.

Example configuration:

Correct answer = +1
Incorrect answer = +0

Do not permanently hardcode scoring.

Negative marking can be enabled only when configured by admin.


==================================================
31. QUIZ SECURITY
==================================================

Participants must never receive:

- Correct answers
- Other teams' answers
- Hidden scores
- Hidden rankings
- Admin data

Scoring must happen server-side.

The browser must not determine official scores.


==================================================
32. QUIZ TIMER
==================================================

The timer must be authoritative.

When time expires:

- Quiz locks
- Submission is finalized
- Participant cannot continue

A browser refresh must not reset the timer.

The system must handle:

- Refresh
- Temporary connection loss
- Reconnection
- Duplicate submissions
- Expired quiz
- Already submitted quiz


==================================================
33. QUALIFICATION SYSTEM
==================================================

Admin can configure:

- Number of qualifying teams
- Score threshold
- Tie-breaker
- Qualification rules

Admin can:

- Review scores
- Review ranking
- Select qualified teams
- Publish qualification results


==================================================
34. HIDDEN SCORES
==================================================

Detailed scores and qualification analytics are ADMIN ONLY unless explicitly published.

Do not hide sensitive information only through CSS or frontend logic.

Hidden information must not be returned to unauthorized clients.

Never expose hidden scores through:

- Frontend state
- API responses
- URLs
- Client-side variables


==================================================
35. QUALIFICATION REVEAL
==================================================

Before release:

QUALIFICATION RESULTS

Results will be announced shortly.

After release:

QUALIFIED TEAMS

Only officially published information becomes visible publicly.


==================================================
36. AUCTION SYSTEM
==================================================

Auction is a major GCL gameplay feature.

The auction supports:

- Player/item
- Player/item image
- Skills/attributes
- Base price
- Current bid
- Bid history
- Bid timer
- Selected team
- Team budget
- Remaining budget
- Sold/unsold state
- Bid increments
- Custom bids
- Auction order
- Pause
- Resume
- Undo/correction
- Admin controls


==================================================
37. AUCTION CONFIGURATION
==================================================

All auction rules must be configurable.

Admin can configure:

- Starting team budget
- Base prices
- Bid increment
- Timer duration
- Auction order
- Available players/items
- Number of rounds
- Eligibility

Previous GCL example configuration:

Starting budget:
₹5 Crore

Base prices:

R1/R4:
₹20 Lakh

R2:
₹30 Lakh

R3:
₹50 Lakh

Bid increment:
₹10 Lakh

Auction timer:
3 minutes

These are example/configurable values and must NOT be permanently hardcoded.


==================================================
38. AUCTION ITEM
==================================================

Each auction item can contain:

- Name
- Image
- Description
- Category
- Skills
- Base price
- Status
- Auction order
- Edition

Statuses:

AVAILABLE
LIVE
SOLD
UNSOLD
WITHDRAWN


==================================================
39. LIVE AUCTION
==================================================

The live auction screen is designed for:

- Projectors
- Event halls
- Large displays
- Audience
- Streaming

Display:

CURRENT ITEM

CURRENT BID

BIDDING TEAM

TIME REMAINING

RECENT BID ACTIVITY

Optional:

TEAM BUDGET

The information must be readable from a distance.


==================================================
40. TEAM AUCTION DASHBOARD
==================================================

Each participating team has a private auction dashboard.

Display:

TEAM IDENTITY

- Team name
- Team logo
- Captain

BUDGET

- Starting budget
- Current budget
- Amount spent
- Remaining budget

ROSTER

- Acquired players/items
- Price paid

LIVE AUCTION

- Current item
- Current bid
- Timer
- Bid controls


==================================================
41. BID VALIDATION
==================================================

A bid is accepted only when:

Auction = LIVE
AND
Item = AVAILABLE/LIVE
AND
Team = ELIGIBLE
AND
Bid > Current Bid
AND
Bid <= Available Budget

Otherwise:

REJECT BID

Validation must happen server-side.


==================================================
42. ADMIN AUCTION CONSOLE
==================================================

Admin controls:

- Select current player/item
- Select bidding team
- Enter bid
- Increase bid
- Custom bid
- Validate budget
- Start timer
- Pause timer
- Resume timer
- Mark SOLD
- Mark UNSOLD
- Undo transaction
- Correct transaction
- Move to next item
- Control auction order
- View transaction history

Every transaction must be logged.


==================================================
43. AUCTION RULES
==================================================

If team budget is insufficient:

BLOCK THE BID

If auction is paused:

BLOCK BIDS

If item is sold:

LOCK THE ITEM

If auction has ended:

BLOCK NEW BIDS

If team is disqualified:

BLOCK BIDS


==================================================
44. AUCTION TIMER
==================================================

The auction timer must be server-authoritative.

Store:

- Start timestamp
- End timestamp
- Pause timestamp
- Current state

States:

NOT_STARTED
LIVE
PAUSED
ENDED

Client-side timer is only a display.

Final auction decisions must be based on server time.


==================================================
45. AUCTION TRANSACTIONS
==================================================

Every successful transaction must store:

- Edition
- Auction
- Item
- Team
- Final price
- Timestamp
- Admin/operator
- Status

Transactions must be auditable.


==================================================
46. AUCTION CORRECTION
==================================================

Admin can correct an incorrect transaction.

Correction must:

- Update affected state
- Restore/recalculate budget
- Restore item state if required
- Create audit record

Never silently change historical transactions.


==================================================
47. AUCTION UNDO
==================================================

Admin can undo the latest transaction when event rules allow.

Undo must:

- Reverse budget
- Restore item status
- Restore previous state
- Create audit record

Completed/finalized auctions must not be casually reset.


==================================================
48. LEADERBOARD
==================================================

Leaderboard can display:

- Rank
- Team
- Points
- Status
- Round

States:

HIDDEN
LIVE
PUBLISHED
FINAL

Only officially public information should be displayed.


==================================================
49. LEADERBOARD SECURITY
==================================================

Team users must not automatically receive other teams' hidden performance.

If leaderboard information is private, it must remain private at database/API level.


==================================================
50. RESULTS SYSTEM
==================================================

Results support:

- Round results
- Qualification
- Final rankings
- Winners
- Finalists
- Awards

Official results become immutable after finalization.

If a correction is required:

- Only authorized admins can perform it
- Correction must be logged


==================================================
51. HALL OF FAME
==================================================

Create a permanent GCL Hall of Fame.

For every edition:

- Champion
- Finalists
- Team
- Team members
- Results
- Event photos

The Hall of Fame grows every year.


==================================================
52. PREVIOUS EDITIONS
==================================================

Route:

/editions

Each edition should contain:

- Year
- Event identity
- Schedule
- Teams
- Rounds
- Results
- Winner
- Finalists
- Photos
- Highlights
- Announcements

Previous editions should feel like seasons of a league, not blog posts.


==================================================
53. SCHEDULE
==================================================

Create a clear event schedule.

Possible stages:

Registration
Qualifier
Elimination
Auction
Competition
Final
Awards

Each schedule item contains:

- Title
- Description
- Date
- Start time
- End time
- Status

Only use actual event dates.


==================================================
54. RULES
==================================================

Create a dedicated Rules page.

Support:

- Eligibility
- Registration
- Team formation
- Quiz rules
- Qualification
- Auction rules
- Budget rules
- Scoring
- Competition rules
- Elimination
- Final decisions
- Code of conduct

Never invent rules.

Missing information must be marked:

DRAFT — ORGANIZER REVIEW REQUIRED


==================================================
55. ORGANIZERS
==================================================

Create an Organizers section.

Possible roles:

- Director
- Event Coordinator
- Technical Coordinator
- Faculty Coordinator
- Organizing Team

Use real names and photos only.

Never invent organizers.


==================================================
56. GALLERY
==================================================

Create a proper GCL event gallery.

Categories:

- Competition
- Teams
- Auction
- Finals
- Winners
- Behind the Scenes

Use real event photos.

Images should feel like editorial event coverage rather than decorative backgrounds.


==================================================
57. ANNOUNCEMENTS
==================================================

Create an Updates / Announcements system.

Examples:

- Registration Open
- Round Announcement
- Schedule Update
- Quiz Announcement
- Qualification Result
- Auction Announcement
- Winner Announcement

Announcement states:

DRAFT
SCHEDULED
PUBLISHED
ARCHIVED


==================================================
58. AUTHENTICATION
==================================================

Use Supabase Auth.

Support:

TEAM / PARTICIPANT
ADMIN / ORGANIZER
PUBLIC SPECTATOR

Team users:

- Login
- Dashboard
- Team information
- Competition access
- Quiz access
- Auction participation where applicable
- Results according to permissions

Admin:

- Admin dashboard
- Event management
- Team management
- Round management
- Question management
- Auction control
- Live control
- Leaderboard control
- Results
- Analytics
- Announcements
- Gallery
- Settings


==================================================
59. ADMIN DASHBOARD
==================================================

Admin navigation:

Overview
Editions
Teams
Participants
Rounds
Questions
Quiz Control
Auction Control
Players / Items
Transactions
Leaderboard
Results
Certificates
Schedule
Announcements
Gallery
Organizers
Analytics
Settings
Audit Logs


==================================================
60. ADMIN OVERVIEW
==================================================

Display:

- Current edition
- Registered teams
- Participants
- Current round
- Live status
- Auction status
- Published results
- Certificates generated
- Recent activity


==================================================
61. ADMIN ANALYTICS
==================================================

Admin-only analytics.

Registration:

- Team count
- Participant count
- Growth by edition

Quiz:

- Attempts
- Average score
- Qualification
- Question performance

Auction:

- Total bids
- Highest bid
- Total spending
- Remaining budgets
- Transaction count
- Bid history

Certificates:

- Total generated
- Active
- Revoked
- By type
- By edition


==================================================
62. AUDIT LOG
==================================================

Log sensitive admin operations.

Examples:

- Score change
- Result publication
- Auction correction
- Auction reset
- Certificate revocation
- Team status change
- Participant modification

Store:

- Actor
- Action
- Resource
- Timestamp
- Before state where appropriate
- After state where appropriate


==================================================
63. CERTIFICATE SYSTEM
==================================================

GCL must include an official certificate-generation system.

The system allows authorized Team Captains to generate certificates for specific eligible members of their own team.

A captain must NEVER be able to generate a certificate for another team's member.


==================================================
64. CAPTAIN CERTIFICATE WORKFLOW
==================================================

Team Dashboard
↓
Team Members
↓
Certificates
↓
Select Team Member
↓
Select Allowed Certificate
↓
Preview
↓
Generate Certificate
↓
Certificate ID Created
↓
PDF Generated
↓
Download / Verify


==================================================
65. CERTIFICATE TYPES
==================================================

Admin-configurable certificate types:

- Certificate of Participation
- Certificate of Achievement
- Certificate of Appreciation
- Special Recognition

Only certificate types enabled by the GCL admin should be available.

Captains must not be able to arbitrarily assign achievements.

For example:

A captain must not be able to select:

Winner
Champion
Finalist

unless the admin has officially assigned that achievement.


==================================================
66. CERTIFICATE ELIGIBILITY
==================================================

Admin controls certificate eligibility.

Example:

Participant:
Rahul Sharma

Certificate eligibility:

Participation = YES
Achievement = YES
Winner = NO
Finalist = NO

The captain can only generate certificates that the backend marks as eligible.


==================================================
67. CERTIFICATE DATA
==================================================

The certificate automatically contains:

GEN CODE LEAGUE

Certificate title

This certificate is proudly presented to

[TEAM MEMBER FULL NAME]

for participating as a member of

[TEAM NAME]

in

[GCL EDITION]

Additional information where applicable:

- Role
- Achievement
- Round
- Position
- Certificate ID
- Issue date
- Authorized signature


==================================================
68. CERTIFICATE ID
==================================================

Every certificate must have a unique backend-generated ID.

Example:

GCL-2026-CERT-000123

The certificate ID must:

- Be generated by backend
- Be unique
- Have a database unique constraint
- Never be generated only on the frontend


==================================================
69. CERTIFICATE PDF
==================================================

Generate a professional PDF certificate.

Format:

A4 Landscape

The certificate should contain:

- GCL branding
- Strong typography
- Generous whitespace
- Clean border
- Edition
- Recipient name
- Team name
- Certificate type
- Certificate ID
- QR code
- Authorized signature
- Issue date

Avoid excessive decorative graphics.

The certificate must look like an official GCL document rather than a browser printout.


==================================================
70. CERTIFICATE PREVIEW
==================================================

Before generation, show:

CERTIFICATE PREVIEW

Recipient:
[NAME]

Team:
[TEAM]

Certificate:
[TYPE]

Edition:
[GCL EDITION]

Issue Date:
[DATE]

[GENERATE CERTIFICATE]

[CANCEL]

The captain must be able to verify the selected member before generation.


==================================================
71. CERTIFICATE GENERATION SECURITY
==================================================

After confirmation:

1. Validate captain authentication.
2. Validate captain's team.
3. Validate selected member belongs to that team.
4. Validate certificate type.
5. Validate participant eligibility.
6. Generate unique certificate ID.
7. Store certificate in Supabase.
8. Generate PDF.
9. Show success state.
10. Allow download.

Certificate generation must be server-authorized.

Never trust:

team_id
participant_id
certificate_type
edition_id

supplied by the browser.


==================================================
72. DUPLICATE CERTIFICATE PROTECTION
==================================================

If the same participant already has the same certificate for the same edition:

Show:

CERTIFICATE ALREADY GENERATED

Certificate ID:
GCL-2026-CERT-000123

Actions:

VIEW
DOWNLOAD
VERIFY

Do not silently generate duplicates.

Reissue should require authorized admin action.


==================================================
73. CAPTAIN CERTIFICATE PERMISSIONS
==================================================

Team Captain CAN:

- View own team members
- Generate permitted certificates for own team members
- Preview certificates
- Download certificates
- View certificate history

Team Captain CANNOT:

- Access another team's members
- Modify participant names
- Modify certificate IDs
- Change certificate achievements
- Generate unauthorized achievements
- Delete certificates
- Modify certificate records
- Modify issue dates
- Change edition
- Generate certificates after edition lock unless explicitly permitted


==================================================
74. ADMIN CERTIFICATE MANAGEMENT
==================================================

Admin route:

/admin/certificates

Admin can:

- View all certificates
- Search certificates
- Filter by edition
- Filter by team
- Filter by certificate type
- Filter by status
- View certificate details
- Revoke certificate
- Reissue certificate
- Download certificate
- Verify certificate
- Enable/disable certificate types
- Configure certificate templates
- Configure authorized signatories
- Generate certificates directly


==================================================
75. CERTIFICATE STATUS
==================================================

Certificate statuses:

ACTIVE
REVOKED

If revoked, the verification page must display:

CERTIFICATE REVOKED

Do not permanently delete certificate records.

Certificate history must remain auditable.


==================================================
76. CERTIFICATE HISTORY
==================================================

Store:

- Certificate ID
- Recipient
- Team
- Certificate type
- Edition
- Generated by
- Generated date
- Revoked by
- Revoked date
- Reissue reference
- Template version


==================================================
77. CERTIFICATE DATABASE
==================================================

Conceptual certificates table:

id
certificate_id
edition_id
team_id
participant_id
certificate_type
achievement
issue_date
status
generated_by
generated_at
revoked_by
revoked_at
verification_token
template_version

Foreign key relationships:

Edition
→ Team
→ Participant

Certificate ID must have a unique database constraint.


==================================================
78. CERTIFICATE RLS
==================================================

Implement strict Supabase Row Level Security.

Team Captain can only access certificates belonging to their own team.

Team Captain can insert a certificate only when:

- Authenticated user is captain
- Participant belongs to their team
- Certificate type is allowed
- Edition is valid
- Participant is eligible

Captain cannot:

- Change certificate ownership
- Change certificate ID
- Generate for another team
- Modify issued certificates

Admin has full authorized certificate management.

Public users can only access minimum information required for certificate verification.


==================================================
79. CERTIFICATE TEAM UI
==================================================

Team Dashboard:

CERTIFICATES

Header:

Team Certificates

Description:

Generate official GCL certificates for your team members.

Show team members with:

- Name
- USN / Participant ID where applicable
- Team
- Participation status
- Certificate status

Action:

[GENERATE CERTIFICATE]

For generated certificates:

Certificate:
GCL-2026-CERT-000123

[VIEW]
[DOWNLOAD]


==================================================
80. CERTIFICATE DOWNLOAD
==================================================

After successful generation:

CERTIFICATE READY

[VIEW CERTIFICATE]

[DOWNLOAD PDF]

Filename:

GCL-2026-[TEAM-NAME]-[MEMBER-NAME]-Certificate.pdf

Sanitize filenames so special characters do not break downloads.


==================================================
81. CERTIFICATE VERIFICATION
==================================================

Public route:

/verify/[certificate-id]

Display:

CERTIFICATE VERIFIED

GEN CODE LEAGUE

Certificate of Participation

Awarded to:

[NAME]

Team:

[TEAM NAME]

Edition:

GCL 2026

Certificate ID:

GCL-2026-CERT-000123

Issue Date:

[DATE]

Do not expose private participant information.


==================================================
82. CERTIFICATE QR CODE
==================================================

Every certificate must contain a QR code.

The QR code points to:

/verify/[certificate-id]

Scanning the QR code opens the official GCL verification page.

Do not encode unnecessary private information directly into the QR code.


==================================================
83. CERTIFICATE AUDIT
==================================================

Maintain an audit trail.

Store:

- Certificate ID
- Recipient
- Team
- Certificate type
- Edition
- Generated by
- Generated date
- Revoked by
- Revoked date
- Reissue reference


==================================================
84. DATABASE ARCHITECTURE
==================================================

Core tables:

profiles
roles

editions
edition_settings

participants
teams
team_members

rounds
round_participants

questions
quiz_attempts
quiz_answers
quiz_results
tie_breakers

auction_events
auction_items
auction_bids
auction_transactions
team_budgets

leaderboards
leaderboard_entries

results
winners

schedules
announcements

gallery
organizers

certificate_types
certificate_eligibility
certificates
certificate_audit_logs

notifications
audit_logs


==================================================
85. DATABASE RELATIONSHIPS
==================================================

EDITION
|
|-- Event Details
|-- Schedule
|-- Teams
|-- Participants
|-- Rounds
|    |-- Questions
|    |-- Quiz Results
|    |-- Qualification
|
|-- Auction
|    |-- Players / Items
|    |-- Bids
|    |-- Transactions
|    |-- Team Budgets
|
|-- Leaderboard
|-- Results
|-- Winners
|-- Gallery
|-- Announcements
|-- Certificates


==================================================
86. SECURITY ARCHITECTURE
==================================================

Supabase Row Level Security is mandatory.

Never rely only on frontend authorization.

The backend must validate sensitive operations.

Critical fields must never be trusted directly from the client:

- team_id
- participant_id
- edition_id
- certificate_type
- score
- bid amount
- budget


==================================================
87. TEAM DATA ISOLATION
==================================================

Team A must not access Team B's private information.

This includes:

- Team B members
- Team B budget
- Team B hidden scores
- Team B quiz answers
- Team B analytics
- Team B private certificates


==================================================
88. REALTIME
==================================================

Use Supabase Realtime where appropriate for:

- Live auction
- Current bid
- Auction state
- Leaderboard updates
- Event status
- Admin announcements

Do not use realtime for static information unnecessarily.


==================================================
89. NOTIFICATION SYSTEM
==================================================

Support notifications for:

- Registration
- Team approval
- Round opening
- Quiz opening
- Qualification
- Auction events
- Results release
- Certificate generation
- Announcements

Initial notification channel:

In-app notifications

Future:

- Email
- Push
- WhatsApp


==================================================
90. MOBILE DESIGN
==================================================

Support:

320px
375px
390px
430px
768px
1024px
1440px+

Critical mobile experiences:

- Login
- Team dashboard
- Quiz
- Results
- Certificates
- Certificate download
- Announcements

Auction admin and live auction should have optimized desktop/tablet layouts.


==================================================
91. RESPONSIVE DESIGN
==================================================

Pay special attention to:

- Hero typography
- Navigation
- Leaderboard
- Auction interface
- Tables
- Timers
- Team dashboards
- Admin dashboards
- Modals
- Images
- Horizontal overflow

The mobile version must be intentionally designed.

Do not simply compress the desktop interface.


==================================================
92. MOTION
==================================================

Motion should communicate:

- Progression
- Competition
- State changes
- Live updates
- Reveals

Good:

- Subtle leaderboard changes
- Auction timer transitions
- Result reveal
- Image transitions
- Controlled page transitions

Avoid:

- Every section flying in
- Excessive parallax
- Bouncing cards
- Animated gradients
- Floating objects
- Constant motion

Respect:

prefers-reduced-motion


==================================================
93. ACCESSIBILITY
==================================================

Implement:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible forms
- Useful validation
- Sufficient contrast
- Alt text
- Reduced motion
- Loading states
- Skeleton loaders for real async operations
- Useful empty states
- Useful error states


==================================================
94. PERFORMANCE
==================================================

Requirements:

- Optimized images
- Lazy-loaded gallery
- Efficient database queries
- Pagination for large datasets
- Code splitting where useful
- Realtime only where required
- Minimal dependencies
- Fast initial load


==================================================
95. SEO
==================================================

Public pages should have:

- Page titles
- Meta descriptions
- Open Graph metadata
- Proper heading hierarchy
- Canonical URLs where appropriate
- Structured data where useful


==================================================
96. LEGAL
==================================================

Include:

/privacy
/terms

Only describe actual data practices.

If information is missing:

DRAFT — ORGANIZER REVIEW REQUIRED

Never invent legal commitments.


==================================================
97. REAL CONTENT RULE
==================================================

Use real GCL content and supplied assets.

Never invent:

- Participants
- Winners
- Sponsors
- Statistics
- Prize money
- Dates
- Organizers
- Testimonials
- Rankings
- Teams

If information is missing:

[ORGANIZER INPUT REQUIRED]


==================================================
98. ERROR STATES
==================================================

Every major workflow requires proper error handling.

Network error:

Something went wrong while loading GCL data.

[TRY AGAIN]

Unauthorized:

You don't have permission to access this page.

Not Found:

This GCL resource does not exist.

Empty:

No teams have been published yet.

Certificate error:

This participant is not currently eligible for this certificate.

Auction error:

This bid cannot be accepted because the team's available budget has changed.


==================================================
99. LOADING STATES
==================================================

Use skeleton loaders for:

- Teams
- Leaderboards
- Results
- Gallery
- Dashboard data
- Certificate history
- Auction information

Do not create artificial loading delays.


==================================================
100. EDGE CASES
==================================================

QUIZ:

- Timer expires
- User refreshes
- Internet disconnects
- Internet reconnects
- Duplicate submission
- Quiz already submitted
- Round closes while user is active

AUCTION:

- Two bids occur nearly simultaneously
- Team budget changes
- Auction pauses
- Item already sold
- Timer expires
- Invalid bid
- Admin correction
- Admin undo

TEAM:

- Captain removed
- Member removed
- Team disqualified
- Team locked

CERTIFICATE:

- Certificate already generated
- Participant becomes ineligible
- Certificate revoked
- Certificate reissued
- Edition locked


==================================================
101. ADMIN SETTINGS
==================================================

Edition:

- Name
- Year
- Description
- Status

Registration:

- Open/close
- Required fields

Competition:

- Round configuration
- Scoring

Auction:

- Starting budget
- Base price
- Bid increment
- Timer
- Auction order

Certificates:

- Certificate types
- Eligibility
- Templates
- Signatories


==================================================
102. CONTENT MANAGEMENT
==================================================

Admins should be able to update without code changes where practical:

- Homepage content
- Edition information
- Schedule
- Rules
- Announcements
- Gallery
- Organizers
- Winners


==================================================
103. URL STRUCTURE
==================================================

Public:

/
/about
/editions
/editions/:year
/teams
/teams/:id
/rounds
/rounds/:id
/leaderboard
/results
/schedule
/rules
/winners
/gallery
/announcements
/organizers
/contact
/verify/:certificateId

Authenticated:

/login
/dashboard
/team
/team/members
/team/certificates

Admin:

/admin
/admin/editions
/admin/teams
/admin/participants
/admin/rounds
/admin/questions
/admin/quiz
/admin/auction
/admin/leaderboard
/admin/results
/admin/certificates
/admin/schedule
/admin/announcements
/admin/gallery
/admin/organizers
/admin/analytics
/admin/settings
/admin/audit-logs


==================================================
104. USER JOURNEYS
==================================================

PUBLIC USER:

Homepage
→ Current Edition
→ Understand GCL
→ View Competition
→ Register

PARTICIPANT:

Login
→ Dashboard
→ Team
→ Current Round
→ Participate
→ View Allowed Results

TEAM CAPTAIN:

Login
→ Team Dashboard
→ Team Members
→ Certificates
→ Select Member
→ Select Eligible Certificate
→ Preview
→ Generate
→ Download
→ Verify

AUCTION CAPTAIN:

Login
→ Team Dashboard
→ Auction
→ View Current Item
→ View Current Bid
→ Submit Bid
→ Receive Result
→ Budget Updated

ADMIN:

Login
→ Admin Dashboard
→ Create Edition
→ Configure Teams
→ Configure Rounds
→ Configure Quiz
→ Run Quiz
→ Publish Qualification
→ Run Auction
→ Publish Results
→ Enable Certificates
→ Monitor Platform

CERTIFICATE VERIFICATION:

Scan QR
→ GCL Verification Page
→ Certificate ID
→ Verify Status
→ Display Official Information


==================================================
105. TESTING REQUIREMENTS
==================================================

Authentication:

- Login
- Logout
- Role access
- Unauthorized access

Teams:

- Team isolation
- Captain permissions
- Member permissions

Quiz:

- Timer
- Submission
- Scoring
- Qualification
- Tie-breaker
- Reconnection

Auction:

- Bidding
- Budget validation
- Timer
- Sold
- Unsold
- Pause
- Resume
- Undo
- Correction
- Concurrent bids

Leaderboard:

- Hidden
- Live
- Published
- Final

Certificates:

- Eligibility
- Captain authorization
- PDF generation
- Certificate ID
- QR code
- Verification
- Revocation
- Reissue
- Duplicate prevention

Public:

- Editions
- Results
- Teams
- Gallery
- Rules
- Certificate verification


==================================================
106. ACCEPTANCE CRITERIA
==================================================

The product is production-ready when:

PUBLIC:

- Homepage works
- Navigation works
- Current edition works
- Historical editions work
- Public results work
- Certificate verification works

PARTICIPANTS:

- Authentication works
- Team information works
- Competition access works

CAPTAINS:

- Team dashboard works
- Team members are visible
- Auction works
- Certificates work
- Certificate download works

ADMIN:

- Edition management works
- Team management works
- Participant management works
- Quiz management works
- Auction management works
- Results work
- Certificate management works
- Analytics work
- Audit logs work

SECURITY:

- RLS works
- Hidden scores remain private
- Team isolation works
- Certificate authorization works
- Unauthorized users cannot modify official data

MOBILE:

- Major participant workflows work properly on mobile

DESKTOP:

- Admin dashboard works
- Auction control works
- Live auction works
- Public website works


==================================================
107. DEVELOPMENT WORKFLOW
==================================================

Before modifying an existing project:

1. Inspect repository.
2. Inspect existing pages.
3. Inspect existing components.
4. Inspect existing assets.
5. Inspect backend integration.
6. Inspect database structure.
7. Identify existing working features.
8. Preserve working functionality.
9. Do not rewrite working features unnecessarily.

Then:

1. Establish GCL design system.
2. Build hero.
3. Build current edition.
4. Build competition journey.
5. Build representative competition section.
6. Test desktop.
7. Test mobile.
8. Extend design system.
9. Connect backend.
10. Implement authentication.
11. Implement permissions.
12. Implement admin controls.
13. Implement competition workflows.
14. Implement certificate system.
15. Test security.
16. Test accessibility.
17. Test edge cases.
18. Fix observed issues.


==================================================
108. MVP PHASES
==================================================

PHASE 1 — FOUNDATION

- React
- Vite
- TypeScript
- Supabase
- Authentication
- Database
- Roles
- Edition system
- Public website

PHASE 2 — TEAMS

- Registration
- Participants
- Teams
- Captain dashboard
- Team members

PHASE 3 — COMPETITION

- Rounds
- Questions
- Quiz
- Timer
- Scoring
- Qualification
- Tie-breaker

PHASE 4 — AUCTION

- Auction
- Items
- Bidding
- Budgets
- Timer
- Transactions
- Live auction
- Admin auction control

PHASE 5 — RESULTS

- Leaderboard
- Results
- Final standings
- Winners
- Hall of Fame

PHASE 6 — CERTIFICATES

- Certificate types
- Eligibility
- Captain certificate generator
- PDF generation
- Certificate ID
- QR verification
- Admin certificate management
- Revocation
- Reissue

PHASE 7 — POLISH

- Gallery
- Announcements
- Analytics
- Audit logs
- Accessibility
- SEO
- Performance
- Mobile optimization


==================================================
109. FUTURE FEATURES
==================================================

Possible future additions:

- GCL global rankings
- Cross-edition participant profiles
- Team history
- Player statistics
- GCL points
- Participant achievements
- Email certificates
- WhatsApp notifications
- Push notifications
- Live streaming
- Sponsor management
- Advanced analytics
- Public API
- GCL mobile application


==================================================
110. FINAL QUALITY CHECK
==================================================

Before declaring the platform complete:

[ ] GCL branding is immediately recognizable
[ ] GCL means Gen Code League everywhere
[ ] Website does not look AI-generated
[ ] Website does not look like generic SaaS
[ ] Previous GCL identity has been evolved, not copied
[ ] Hero clearly explains GCL
[ ] Current edition is obvious
[ ] Primary CTA is clear
[ ] Competition journey is understandable
[ ] Teams work
[ ] Team dashboard works
[ ] Quiz works
[ ] Quiz timer works
[ ] Quiz auto-lock works
[ ] Qualification works
[ ] Tie-breaker works
[ ] Auction works
[ ] Budget validation works
[ ] Bid controls work
[ ] Auction timer works
[ ] SOLD works
[ ] UNSOLD works
[ ] Pause works
[ ] Resume works
[ ] Undo works
[ ] Correction works
[ ] Transaction log works
[ ] Leaderboard permissions work
[ ] Hidden scores remain private
[ ] Admin analytics remain private
[ ] Results can be published
[ ] Finalized results are protected
[ ] Previous editions work
[ ] Hall of Fame works
[ ] Gallery works
[ ] Schedule works
[ ] Rules work
[ ] Announcements work
[ ] Admin dashboard works
[ ] Authentication works
[ ] Supabase security works
[ ] RLS policies work
[ ] Team data isolation works
[ ] Certificate eligibility works
[ ] Captain certificate generation works
[ ] Certificate PDF works
[ ] Certificate ID is unique
[ ] QR verification works
[ ] Certificate revocation works
[ ] Certificate reissue works
[ ] Duplicate certificate protection works
[ ] Mobile layout works
[ ] Desktop layout works
[ ] Keyboard navigation works
[ ] Loading states exist
[ ] Error states exist
[ ] Empty states exist
[ ] Privacy Policy exists
[ ] Terms exist
[ ] No fake content exists
[ ] No unnecessary dependencies were added


==================================================
111. FINAL IMPLEMENTATION REPORT
==================================================

After implementation, report only what was actually completed.

Provide:

1. Design direction implemented
2. Pages created
3. Features implemented
4. Database tables created
5. Backend functionality completed
6. Authentication implemented
7. Permission/RLS model
8. Competition functionality
9. Auction functionality
10. Certificate functionality
11. What was tested
12. Desktop testing results
13. Mobile testing results
14. Security testing results
15. Remaining organizer inputs
16. Remaining unfinished functionality

Never claim that something was tested if it was not actually tested.


==================================================
112. FINAL PRODUCT DEFINITION
==================================================

GEN CODE LEAGUE is not just a website.

It is a permanent competitive coding league platform.

The final system consists of five connected experiences:

1. PUBLIC GCL

Discover the league, editions, teams, results, winners and history.

2. PARTICIPANT GCL

Participate in competition rounds.

3. CAPTAIN GCL

Manage the team competition experience and generate eligible certificates.

4. LIVE GCL

Run quizzes, auctions, timers, leaderboards and competition stages.

5. ADMIN GCL

Control editions, teams, participants, competition, auction, results, certificates, analytics and history.


==================================================
113. PERMANENT GCL LOOP
==================================================

NEW EDITION
↓
REGISTRATION
↓
TEAMS
↓
COMPETITION
↓
QUIZ / ELIMINATION
↓
QUALIFICATION
↓
AUCTION
↓
LIVE COMPETITION
↓
LEADERBOARD
↓
FINALS
↓
WINNERS
↓
CERTIFICATES
↓
HISTORY
↓
NEXT EDITION
↓
NEW EDITION


==================================================
114. MOST IMPORTANT ARCHITECTURAL RULE
==================================================

DO NOT BUILD "GCL 2026".

BUILD:

GCL PLATFORM

that contains:

GCL 2026

The database, routes, components, permissions, admin panel and competition engine must be edition-based.

Every major entity should be associated with the relevant edition.

The same application must be capable of creating:

GCL 2027

GCL 2028

GCL 2029

without rebuilding the application.


==================================================
115. FINAL DESIGN TARGET
==================================================

GEN CODE LEAGUE

Not a generic website.

Not a generic SaaS template.

Not an AI-generated landing page.

Not a one-time event page.

It should feel like:

APPLE-LEVEL RESTRAINT
+
SPORTS-LEAGUE ENERGY
+
COMPETITIVE CODING
+
LIVE COMPETITION
+
GCL'S OWN IDENTITY

The final product should be a professional permanent digital home for Gen Code League.

Every year should add more history, teams, results, champions, media and certificates to the same GCL platform.

The platform should become more valuable with every edition.