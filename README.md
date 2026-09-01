# Arancini Report

Build a mobile-first customer follow-up web app for Gold of Sicily, a B2B supplier of Sicilian arancini to bars and hospitality venues.

Use Lovable Cloud for authentication and database storage.

Main objective

The app should make it possible for a bar or restaurant customer to submit a complete shift report in less than 60 seconds, while giving Gold of Sicily an admin dashboard for sales demand, customer stock, product feedback and production planning.

The app must feel extremely simple for customers.

There are two roles:

Admin

Customer

There must be no public signup.

Admins create customer accounts and assign usernames and passwords.

Customers log in using:

Username

Password

If the underlying authentication system requires email-based accounts, implement this internally so the customer-facing login still only asks for username and password.

Every customer user must be connected to exactly one customer account.

Implement proper authorization and row-level security so customers can only access their own customer data and reports. Admin users can access all customers.

LANGUAGE

The app must support:

Norwegian

English

Show a clear:

NO | EN

language selector on the login page.

The selected language should apply to the complete user session.

All customer-facing labels, buttons, validation messages and confirmations must have Norwegian and English translations.

CUSTOMER EXPERIENCE

After login, the customer should immediately arrive at their shift report.

Do not create a complicated dashboard for customers.

Show:

Gold of Sicily logo

Customer name

Example:

OSLO BAR & BOWLING

60 SECOND SHIFT REPORT

The report should contain these questions.

1. Delivery

Show the most recent delivery registered by admin.

Example:

We delivered 400 pcs.
Did you receive the correct quantity?

Norwegian:

Vi leverte 400 stk.
Fikk dere riktig antall?

Buttons:

YES
NO

Norwegian:

JA
NEI

If NO is selected, display:

How many did you actually receive?

Norwegian:

Hvor mange mottok dere faktisk?

Numeric input.

2. Sales

How many were sold this shift?

Norwegian:

Hvor mange ble solgt dette skiftet?

Large numeric input with + and - controls where appropriate.

3. Current stock

How many are left now?

Norwegian:

Hvor mange har dere igjen nå?

Large numeric input.

4. Guest feedback

What did guests think?

Norwegian:

Hva sa gjestene?

Three quick-select options:

Positive
Mixed
Negative

Norwegian:

Positivt
Blandet
Negativt

Then provide an optional short text field:

Anything we should know?

Norwegian:

Noe vi burde vite?

5. Preparation

Any preparation issues?

Norwegian:

Noen problemer med tilberedningen?

YES / NO

If YES, open a small text field:

What happened?

Norwegian:

Hva skjedde?

6. Next requirement

How many do you need for the next delivery/weekend?

Norwegian:

Hvor mange trenger dere til neste levering/helg?

Numeric input.

At the bottom have one large primary CTA:

SUBMIT REPORT

Norwegian:

SEND RAPPORT

After submission show a clean success state:

Report received. Thank you.

Norwegian:

Rapport mottatt. Takk.

A report should be possible to complete comfortably on a phone in less than 60 seconds.

Do not require unnecessary text input.

CUSTOMER HISTORY

Customers should also have a discreet secondary navigation option called:

History / Historikk

Here they can see their previous shift reports and deliveries.

Keep this page simple.

Customers must only see their own records.

ADMIN

Create a separate admin experience.

Admin navigation:

Dashboard
Customers
Reports
Deliveries

Admin dashboard

At the top show four useful metrics:

Sold this week
Current customer stock
Requested next delivery
Customers awaiting a report

Norwegian:

Solgt denne uken
Lager hos kunder
Ønsket neste levering
Venter på rapport

Below this show a customer overview table/card list.

Columns:

Customer
Last report
Sold
Current stock
Next requirement
Status

Use simple status indicators:

Green = recently reported and no issue
Orange = low stock, preparation issue or report becoming overdue
Red = no recent report / needs attention

Clicking a customer opens their customer detail page.

CUSTOMER DETAIL PAGE

Use tabs:

Overview
Reports
Deliveries
Account

Overview should show:

Current estimated stock

Latest reported stock

Sales this week

Latest guest feedback

Latest preparation issue

Requested next quantity

Last report date

Reports shows their complete report history.

Deliveries shows all registered deliveries.

Account allows admin to:

Change customer name

Set active/inactive

View username

Reset/change password

Change default language

CUSTOMER MANAGEMENT

Admin can create a customer.

Fields:

Customer name
Location
Username
Password
Default language
Active/inactive

When creating the customer, create/link the authentication account and customer profile automatically.

No customer self-registration.

DELIVERIES

Admin can register a delivery.

Fields:

Customer
Delivery date
Quantity
Optional note

The latest delivery quantity should automatically appear in the customer's next shift report:

"We delivered X pcs. Was this correct?"

Keep historical deliveries.

DATA MODEL

Create appropriate Lovable Cloud database tables based around:

customers
profiles
deliveries
shift_reports

profiles should include:

id
username
role
customer_id
preferred_language

customers should include:

id
name
location
active
created_at

deliveries should include:

id
customer_id
quantity
delivered_at
note
created_at

shift_reports should include:

id
customer_id
submitted_by
created_at
delivery_id
delivery_correct
actual_quantity_received
sold_this_shift
remaining_stock
guest_feedback_rating
guest_feedback_text
preparation_issue
preparation_issue_text
next_required_quantity

Add relationships, indexes and security policies as appropriate.

DATA QUALITY

Do not prevent the customer from submitting a report simply because numbers appear inconsistent.

However, calculate whether:

previous stock

deliveries

reported sales

roughly matches the new reported stock.

If there appears to be a mismatch, flag the report for admin review.

The customer should not have to solve the discrepancy.

DESIGN

Use the visual identity of goldofsicily.no as inspiration.

The app should feel like Gold of Sicily, not like a generic SaaS dashboard.

Style:

Warm cream/off-white background

Dark typography

Subtle Sicilian gold/yellow accent

Restrained use of green

Premium but informal

Italian hospitality character

Lots of whitespace

Soft rounded cards and inputs

Strong typography

Large touch targets

Mobile-first

Clean and fast

Avoid:

Generic blue SaaS styling

Excessive gradients

Dense dashboards

Tiny text

Unnecessary charts

Complicated navigation

Excessive animations

The customer reporting experience is the most important page in the entire application.

Build the complete working MVP with Lovable Cloud authentication, database, authorization, bilingual UI, customer reporting and admin dashboard.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aranicnireport.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dec2cc90-73fe-4620-acd3-0c0a977e2d72).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
