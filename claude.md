# BJJ Gym Platform – Full Product & Technical Spec

## 1. Overview

Web-based platform for a BJJ gym that combines:

- Member sign-up, CRM, and digital enrollment (web + walk-in kiosk).
- Class/program scheduling and automated rosters.
- Attendance, check-ins, promotion tracking, and family accounts.
- POS (drinks/gear/events) with barcode scanning and Stripe billing.
- Marketing automations, messaging, and performance analytics.
- Branded mobile app for training content and student portal.

Includes:

- **Admin/Owner Web App**
- **Staff/Kiosk Web App**
- **Member/Parent Portal**
- **Branded Mobile App (white-label)**
- **Backend API + DB**
- **Stripe Integration**

------------------------------------------------------------------------

## 2. Modules & Capabilities

### 2.1 Program management (classes & calendar)

- **Master calendar**
  - Create classes, programs, seminars, intro trials, privates.
  - Fields: name, type (gi/no-gi/youth/seminar/private), instructor, location, capacity, recurrence.
- **Scheduling tools**
  - Separate views for gi, no-gi, youth, seminars, intro trials.
  - Booking for privates (students can request/confirm slots).
- **Automated rosters**
  - Class roster auto-built from check-ins and bookings.
  - Mark no-shows; track trial vs member attendance.

### 2.2 Member management & Jiu Jitsu CRM

- **Member profiles**
  - Personal info, belt\_rank, age group, training\_type, photo, waiver status.
  - Membership plans (gi, no-gi, family, kids, hybrid, online).
  - Stripe-backed billing context: customer, subscriptions, payment status.
- **Lead & trial management**
  - Lead records from website forms and walk-in kiosk.
  - Trial classes: track attendance, conversion to membership.
- **Family accounts**
  - Parent account with linked child members.
  - Sibling discounts and shared billing.
  - Parent dashboard: schedules, attendance, belt progress.

### 2.3 Revenue generation & marketing

- **Membership sales & renewals**
  - Flexible plans: gi/no-gi/family/kids/online/drop-in.
  - Sell and renew memberships via web, kiosk, or staff.
- **Promotions & campaigns**
  - Track promotions by rank, age group, instructor, or program.
  - Lead acquisition funnels: intro classes, seminars, online campaigns.
- **Marketing automations**
  - Follow-ups after intro classes or trials.
  - Messages after failed payments or inactivity.
  - Belt-specific communications (white belt vs purple belt messaging).
  - Birthday and milestone automations.

### 2.4 Communications (email, SMS, in-app)

- **Messaging channels**
  - Email, SMS, in-app notifications, push (mobile app).
- **Automation triggers**
  - Trial attendance, inactivity, birthday, promotion, failed payment.
- **Parent communication portals**
  - Parents see progress metrics (classes attended, techniques mastered, months completed).
  - Reduce ad-hoc texting; use portal + automated updates.

### 2.5 Performance analytics & reporting

- **Club growth & performance**
  - Active students, prospects, churn, conversion rates.
  - Attendance by rank, age group, instructor, program.
- **Revenue & billing**
  - Membership revenue, POS revenue, events/seminars.
  - Payment status, past-due accounts, Stripe context.
- **Owner-ready reports**
  - Exportable reports: revenue, attendance, members, prospects.
  - Automated reporting across students, instructors, attendance, payments.

### 2.6 Digital enrollment & kiosks

- **Website lead capture**
  - Embedded forms: intro class sign-up, membership interest, seminar registration.
  - Leads flow into CRM with status (new, contacted, trial, converted).
- **Walk-in kiosk enrollment**
  - Tablet at front desk for walk-ins:
    - Collect personal info, waiver, photo.
    - Choose plan, enter card, start membership.
- **Kiosk check-in**
  - QR/barcode or name lookup.
  - Show photo, belt\_rank, membership status.
  - Check-ins tied to schedules for useful attendance data.

### 2.7 Training content & curriculum

- **Curriculum builder**
  - Structured lesson plans by belt level and program.
  - Upload video tutorials and technique flowcharts.
  - Tag workouts (warmups, mobility, drills).
- **Workout delivery**
  - Deliver remote training or supplemental content via branded app.
  - At-home mobility routines, technique reviews, warmups.
- **Promotion-linked attendance**
  - Belt requirements defined per rank (classes, techniques, time).
  - Check-ins count toward promotion; students see progress.

### 2.8 Branded Jiu Jitsu app & student portal

- **Custom branding**
  - School logo, colors, and name.
- **Student portal**
  - View schedule, attendance, belt progress, curriculum.
  - Manage bookings (classes, privates), payments, and profile.
- **Mobile apps**
  - iOS/Android front-end consuming same API.
  - Push notifications for reminders, promotions, content drops.

------------------------------------------------------------------------

## 3. Data Model (SQL-style)

\`\`\`sql
TABLE members (
id SERIAL PRIMARY KEY,
parent\_id INTEGER REFERENCES members(id) NULL, – for family accounts
name VARCHAR(255),
email VARCHAR(255),
phone VARCHAR(50),
address TEXT,
date\_of\_birth DATE,
age\_group VARCHAR(50), – ‘kids’, ‘adult’
belt\_rank VARCHAR(50),
training\_type VARCHAR(50), – ‘Gi’, ‘No-Gi’, ‘Both’
photo\_url TEXT,
status VARCHAR(50), – ‘active’, ‘past\_due’, ‘canceled’, ‘inactive’, ‘lead’, ‘trial’
stripe\_customer\_id VARCHAR(255),
waiver\_signed\_at TIMESTAMP NULL,
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE membership\_plans (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
description TEXT,
price\_cents INTEGER,
billing\_interval VARCHAR(50), – ‘monthly’
class\_limit INTEGER NULL,
plan\_type VARCHAR(50), – ‘gi’, ‘no-gi’, ‘family’, ‘kids’, ‘online’, ‘drop-in’
stripe\_price\_id VARCHAR(255),
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE subscriptions (
id SERIAL PRIMARY KEY,
member\_id INTEGER REFERENCES members(id),
plan\_id INTEGER REFERENCES membership\_plans(id),
stripe\_subscription\_id VARCHAR(255),
status VARCHAR(50), – ‘active’, ‘past\_due’, ‘canceled’
start\_date DATE,
end\_date DATE NULL,
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE programs (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
type VARCHAR(50), – ‘gi’, ‘no-gi’, ‘youth’, ‘seminar’, ‘intro’, ‘private’
description TEXT,
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE classes (
id SERIAL PRIMARY KEY,
program\_id INTEGER REFERENCES programs(id),
name VARCHAR(255),
start\_time TIMESTAMP,
end\_time TIMESTAMP,
instructor\_name VARCHAR(255),
capacity INTEGER NULL,
recurrence\_rule TEXT NULL,
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE bookings (
id SERIAL PRIMARY KEY,
member\_id INTEGER REFERENCES members(id),
class\_id INTEGER REFERENCES classes(id),
status VARCHAR(50), – ‘booked’, ‘attended’, ‘no\_show’, ‘canceled’
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE attendance (
id SERIAL PRIMARY KEY,
member\_id INTEGER REFERENCES members(id),
class\_id INTEGER REFERENCES classes(id) NULL,
timestamp TIMESTAMP,
source VARCHAR(50) – ‘kiosk’, ‘staff’, ‘app’
);

TABLE items (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
barcode VARCHAR(255) UNIQUE,
price\_cents INTEGER,
tax\_rate NUMERIC(5,2),
stock INTEGER NULL,
category VARCHAR(50), – ‘drinks’, ‘gear’, ‘events’
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE sales (
id SERIAL PRIMARY KEY,
member\_id INTEGER REFERENCES members(id) NULL,
total\_cents INTEGER,
payment\_method\_type VARCHAR(50), – ‘card\_on\_file’, ‘new\_card’, ‘cash’
stripe\_payment\_intent\_id VARCHAR(255) NULL,
created\_at TIMESTAMP
);

TABLE sale\_line\_items (
id SERIAL PRIMARY KEY,
sale\_id INTEGER REFERENCES sales(id),
item\_id INTEGER REFERENCES items(id),
quantity INTEGER,
unit\_price\_cents INTEGER
);

TABLE workflows (
id SERIAL PRIMARY KEY,
name VARCHAR(255),
trigger\_type VARCHAR(50), – ‘trial\_attendance’, ‘inactivity’, ‘birthday’, ‘failed\_payment’, ‘promotion’
config JSONB,
active BOOLEAN DEFAULT TRUE,
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE messages (
id SERIAL PRIMARY KEY,
member\_id INTEGER REFERENCES members(id),
channel VARCHAR(50), – ‘email’, ‘sms’, ‘push’, ‘in\_app’
subject VARCHAR(255),
body TEXT,
sent\_at TIMESTAMP,
workflow\_id INTEGER REFERENCES workflows(id) NULL
);

TABLE belt\_requirements (
id SERIAL PRIMARY KEY,
belt\_rank VARCHAR(50),
min\_classes INTEGER,
min\_months INTEGER,
min\_techniques INTEGER,
created\_at TIMESTAMP,
updated\_at TIMESTAMP
);

TABLE technique\_progress (
id SERIAL PRIMARY KEY,
member\_id INTEGER REFERENCES members(id),
belt\_rank VARCHAR(50),
technique\_name VARCHAR(255),
mastered BOOLEAN,
updated\_at TIMESTAMP
);
