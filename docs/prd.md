# SmartFeeder Web App: Product Requirements Document (PRD)

## Title

**SmartFeeder Web App**

---

## Overview

The SmartFeeder Web App enables hobby farmers and property owners in Australia to remotely monitor and control animal feeders. It provides features like viewing live camera feeds (mocked initially), manually releasing feed, and setting automatic feeding schedules. The app aims to offer convenience and peace of mind for users managing livestock such as horses, cows, or chickens, particularly when they are away from their properties.

---

## Success Metrics

- **Number of active users:** Target 500 within 6 months post-launch
- **Frequency of logins and interactions:** Average 3 logins per week per user
- **User satisfaction ratings:** Target 4+ stars on feedback surveys
- **Retention rate of subscribers:** Target 80% retention after 3 months
- **Reported reduction in manual feeding tasks:** Target 50% reduction based on user feedback

---

## Messaging

> **"SmartFeeder: Empowering hobby farmers with smart, remote feeder management. Monitor your animals, control feeding, and ensure their well-being from anywhere."**

---

## Timeline / Release Planning

- **MVP Development:** June–August 2025
- **Beta Testing:** September 2025
- **Official Launch:** October 2025

---

## Personas

### Primary Persona

**John** – 45-year-old hobby farmer with a full-time city job, owns a small farm with horses and chickens. Needs to ensure animals are fed on schedule remotely.

### Secondary Persona

**Sarah** – Retiree who keeps goats and enjoys gardening. Wants to reduce physical workload and monitor feeding while traveling.

---

## User Scenarios

- **Scenario 1:** John, at his office, checks the SmartFeeder app to see if his horses have eaten. He views a mocked camera feed showing an empty feeder, triggers a manual feed release, and sets a schedule for the next feeding.
- **Scenario 2:** Sarah, on vacation, uses the app on her tablet to adjust her goats’ feeding schedule and receives a notification about a low feed level (mocked).

---

## User Stories / Features / Requirements

### User Authentication

- Users can sign up with an email and password.
- Users can log in with their email and password.
- Users can reset their password if forgotten.
- _Future enhancement:_ Implement two-factor authentication.

### Dashboard

- Display a list of all feeders associated with the logged-in user.
- Each feeder should show:
  - Name
  - Location
  - Animal type
  - Current status (e.g., 'Full', 'Low', 'Empty')
  - Last fed time
  - Next scheduled feeding time
- Provide quick actions for each feeder:
  - **Manual feed release:** Button to simulate feed release and show confirmation.
  - **View camera feed:** Button opens a modal or new page with a placeholder image/video.

### Feeder Management

- Allow users to add new feeders with:
  - Unique ID (auto-generated)
  - Name
  - Location
  - Animal type
- Allow users to edit existing feeders' details.
- Allow users to delete feeders.

### Camera Integration

- For each feeder, display a mocked camera feed (static image or looping video).
- _Future enhancement:_ Integrate with actual camera hardware.

### Scheduling

- Allow users to set feeding schedules for each feeder.
- Schedules can be daily or weekly with specific times.
- Display a list of all schedules, with the ability to edit or delete them.

### Notifications

- Show mocked notifications for:
  - Low feed levels
  - Technical issues (e.g., camera offline)
  - Upcoming feedings
- _Future enhancement:_ Integrate with actual notification systems (email, push).

### Payments (if applicable)

- Offer subscription plans (e.g., monthly, yearly) for app access.
- Allow one-time payments for specific features or premium content.
- Integrate with **Stripe** for payment processing.

---

## Features Out

- Third-party weather service integration
- Advanced animal behavior analytics
- Dedicated mobile app (focus on responsive web app initially)

---

## Designs

- Create wireframes and mockups using **Figma**
- Use **Shadcn UI** components for consistent, accessible design

---

## Open Issues

- Handling multiple feeders per user (e.g., maximum limit)
- Mocked camera feed format (static images vs. videos)
- Data security for camera feeds and user data

---

## Q&A

**Q:** Can the app be used on mobile devices?  
**A:** Yes, the web app is responsive for mobile use; a dedicated app is planned later.

**Q:** Is user data secure?  
**A:** Yes, we use encryption and secure authentication via **Supabase**.

---

## Other Considerations

- Prioritize accessibility for non-tech-savvy users (simple navigation)
- Plan for scalability to handle a growing user base

---

## Technical Requirements

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Supabase (PostgreSQL database, Authentication)
- **Package Manager:** pnpm
- **Hosting:** Vercel
- **Payments:** Stripe
- **Analytics:** Vercel Analytics
