# SmartFeeder Web App: Product Requirements Document (PRD)

## Title

**SmartFeeder Web App**

---

## Overview

The SmartFeeder Web App enables hobby farmers and property owners in Australia to remotely monitor and control animal feeders through real-time IoT integration. The platform provides comprehensive feeder management including live sensor data monitoring, automated feeding schedules, manual feed release via MQTT commands, and administrative device commissioning. The app offers convenience and peace of mind for users managing livestock such as horses, cows, or chickens, particularly when they are away from their properties.

---

## Success Metrics

- **Number of active users:** Target 500 within 6 months post-launch
- **Frequency of logins and interactions:** Average 3 logins per week per user
- **User satisfaction ratings:** Target 4+ stars on feedback surveys
- **Retention rate of subscribers:** Target 80% retention after 3 months
- **Reported reduction in manual feeding tasks:** Target 50% reduction based on user feedback
- **IoT device connectivity rate:** Target 95% uptime for commissioned devices
- **Admin efficiency:** Device commissioning time under 2 minutes per device

---

## Messaging

> **"SmartFeeder: Empowering hobby farmers with smart, remote feeder management. Monitor your animals, control feeding, and ensure their well-being from anywhere with real-time IoT connectivity."**

---

## Timeline / Release Planning

- **MVP Development:** June–August 2024 ✅ **COMPLETED**
- **IoT Integration & Admin Portal:** September–December 2024 ✅ **COMPLETED**
- **Beta Testing:** January–February 2025
- **Payment Integration & Camera Feeds:** March–April 2025
- **Official Launch:** May 2025

---

## Current Implementation Status

### ✅ **Completed Features**

- **User Authentication System** (Supabase Auth)
- **Admin Portal & Device Management**
- **Real-time IoT Integration** (AWS IoT Core)
- **Advanced Feeding Schedules** (Multiple sessions, complex intervals)
- **Live Sensor Dashboard** (Real-time data visualization)
- **Manual Feed Release** (MQTT commands)
- **Device Commissioning Workflow**
- **Performance-optimized Database Functions**

### 🚧 **In Development**

- Camera feed integration
- Payment/subscription system
- Push notification system

### 📋 **Planned**

- Mobile app
- Advanced analytics
- Weather integration

---

## Personas

### Primary Persona

**John** – 45-year-old hobby farmer with a full-time city job, owns a small farm with horses and chickens. Needs to ensure animals are fed on schedule remotely and monitor their health through sensor data.

### Secondary Persona

**Sarah** – Retiree who keeps goats and enjoys gardening. Wants to reduce physical workload and monitor feeding while traveling, with real-time alerts for any issues.

### Admin Persona

**Mark** – Operations manager responsible for commissioning and managing IoT devices before they're deployed to customers.

---

## User Scenarios

- **Scenario 1:** John, at his office, checks the SmartFeeder app to see real-time sensor data from his horse feeder. He notices the temperature is dropping and triggers a manual feed release via MQTT command, then adjusts the feeding schedule for winter months.
- **Scenario 2:** Sarah, on vacation, receives a low battery alert from her goat feeder. She views the sensor dashboard, sees the device is still connected, and schedules an increased feeding amount for the next day.
- **Scenario 3:** Mark (admin) receives a batch of 50 new IoT devices. He bulk uploads their device IDs to the commissioning system, making them available for customer assignment.

---

## User Stories / Features / Requirements

### User Authentication ✅ **IMPLEMENTED**

- Users can sign up with an email and password
- Users can log in with their email and password
- Users can reset their password if forgotten
- Email confirmation system for new accounts
- Secure session management via Supabase

### Admin Portal & Device Management ✅ **IMPLEMENTED**

- **Device Commissioning System:**
  - Admins can add new device IDs to the system
  - Bulk upload functionality for multiple devices
  - Device validation ensures only commissioned devices can be used
  - Batch tracking and notes for manufacturing management
- **Admin Access Control:**
  - Admin privileges managed via JWT `app_metadata.is_admin`
  - Secure RLS policies for admin-only operations
- **Device Inventory:**
  - Track device availability and assignment status
  - Support for testing mode (multiple users per device)
  - Device orphaning and reclaiming functionality

### Dashboard ✅ **IMPLEMENTED**

- Display all feeders associated with the logged-in user
- Each feeder shows:
  - Name, location, and device ID
  - Real-time connection status (online/offline/last communication)
  - Creation date and timezone information
  - Quick access to feeder management
- Performance-optimized loading with database functions
- Responsive design for mobile and desktop

### Feeder Management ✅ **IMPLEMENTED**

- Users can add new feeders with commissioned device IDs only
- Device validation prevents unauthorized feeder creation
- Feeder details include:
  - User-friendly name and description
  - Location information
  - Timezone configuration
  - Device ID linking to IoT hardware
- Edit and delete functionality with proper cleanup
- Device orphaning system for device reassignment

### Real-time IoT Integration ✅ **IMPLEMENTED**

- **AWS IoT Core Integration:**
  - MQTT communication for real-time commands
  - Secure authentication via Cognito Identity Pools
  - Topic-based messaging (`${deviceId}/writeDataRequest`)
- **Manual Feed Release:**
  - Real-time MQTT commands to trigger feeding
  - Configurable feed amounts
  - Immediate feedback and confirmation
- **Connection Monitoring:**
  - Real-time device status tracking
  - Last communication timestamps
  - Connection quality indicators

### Sensor Data Dashboard ✅ **IMPLEMENTED**

- **Real-time Data Visualization:**
  - Multiple sensor types (temperature, humidity, voltage, battery, etc.)
  - Interactive charts with Recharts library
  - Time-range filtering (daily, weekly, monthly, all-time)
- **Performance Optimization:**
  - Client-side filtering to reduce database load
  - Efficient data caching and updates
  - Responsive chart rendering
- **Sensor Analytics:**
  - Latest values and reading counts
  - Automatic unit detection and display
  - Multi-sensor correlation views

### Advanced Feeding Schedules ✅ **IMPLEMENTED**

- **Complex Scheduling:**
  - Multiple feeding sessions per day
  - Various intervals: daily, weekly, biweekly, four-weekly
  - Custom day-of-week selection
  - Start and end date ranges
- **MQTT Integration:**
  - Automatic schedule conversion to MQTT commands
  - Real-time schedule updates to devices
  - Feed amount tracking per session
- **Schedule Management:**
  - Visual schedule overview with next feeding times
  - Active/inactive schedule status
  - Easy editing and deletion

### Camera Integration 🚧 **PLANNED**

- Placeholder camera feed modals currently implemented
- _Future enhancement:_ Integrate with actual camera hardware
- Real-time video streaming capability

### Permissions & Team Management 📋 **PLANNED**

- **Multi-User Access Control:**
  - Feeder owners can invite team members via email
  - Support for users with and without existing accounts
  - Role-based permissions (Viewer, Scheduler, Manager, Owner)
  - Fine-grained permission controls for future expansion
- **Invitation System:**
  - Email-based invitations with secure tokens
  - Auto-signup flow for new users
  - Accept/decline workflow for existing users
  - Time-limited invitation tokens (7 days)
- **Team Management:**
  - Member list with role assignments
  - Permission management interface
  - Self-removal capability for team members
  - Audit trail for permission changes

### Notifications 🚧 **PARTIAL**

- Basic toast notifications for user actions
- _Future enhancement:_ Email and push notification system for:
  - Low battery alerts
  - Device connectivity issues
  - Scheduled feeding confirmations
  - System maintenance notifications
  - Team invitation and permission change notifications

### Payments 📋 **PLANNED**

- Subscription plans for app access
- Integration with **Stripe** for payment processing
- Tiered feature access based on subscription level

---

## Database Schema ✅ **IMPLEMENTED**

### Core Tables

- **`feeders`** - User-owned feeder devices with metadata
- **`sensor_data`** - IoT sensor readings with timestamps
- **`feeding_schedules`** - Complex feeding schedule definitions
- **`feeding_sessions`** - Individual feeding times within schedules
- **`commissioned_feeders`** - Admin-managed device inventory

### Permissions Tables (Planned)

- **`feeder_memberships`** - Team member access to feeders
- **`feeder_permissions`** - Fine-grained permission controls
- **`feeder_invitations`** - Email invitation tracking and tokens

### Key Features

- Row Level Security (RLS) on all tables
- Automated timestamp triggers
- Optimized indexes for query performance
- Device validation functions
- Admin privilege enforcement

---

## Technical Requirements ✅ **IMPLEMENTED**

### Frontend Stack

- **Framework:** Next.js 15 with React 19
- **Language:** TypeScript (strict mode, no 'any' types)
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn UI (latest)
- **Charts:** Recharts for data visualization
- **Notifications:** Sonner for toast messages

### Backend & Database

- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with RLS
- **Real-time:** Supabase subscriptions
- **Functions:** PostgreSQL functions for performance

### AWS IoT Infrastructure

- **IoT Core:** MQTT message broker
- **Authentication:** Cognito Identity Pools
- **SDK:** AWS SDK v3 for JavaScript
- **Infrastructure:** AWS CDK for deployment

### Development & Deployment

- **Package Manager:** pnpm (required)
- **Hosting:** Vercel
- **Analytics:** Vercel Analytics
- **Version Control:** Git with Husky pre-commit hooks
- **Testing:** Jest for unit tests

---

## Security & Performance ✅ **IMPLEMENTED**

### Security Features

- Row Level Security (RLS) on all database tables
- JWT-based authentication with secure session management
- Admin access control via app metadata
- Device validation preventing unauthorized access
- Secure MQTT communication with AWS IoT Core

### Performance Optimizations

- Database functions for complex queries
- Client-side data filtering and caching
- Optimized component loading with React Suspense
- Efficient indexing strategy
- Performance monitoring with Vercel Analytics

---

## Infrastructure & DevOps ✅ **IMPLEMENTED**

### AWS CDK Stack

- Infrastructure as Code for AWS resources
- Automated deployment pipeline
- Environment-specific configurations

### Development Workflow

- Husky pre-commit hooks for code quality
- Automated testing and build verification
- Supabase migrations for database changes
- TypeScript strict mode enforcement

---

## Features Out of Scope

- Third-party weather service integration
- Advanced animal behavior analytics
- Dedicated mobile app (focus on responsive web app)
- Video recording and storage
- Multi-tenant architecture (single-user feeders only)

---

## Open Issues & Future Enhancements

### Current Limitations

- Camera feeds are placeholder implementations
- No push notification system
- Payment integration not implemented
- Single-user device ownership (permissions system will enable multi-user access)

### Future Roadmap

- **Permissions & Team Management** (Q1 2025)
  - Multi-user access control with role-based permissions
  - Email invitation system for team collaboration
  - Fine-grained permission management interface
- Real camera hardware integration
- Comprehensive notification system (email, SMS, push)
- Subscription billing with Stripe
- Mobile app development
- Advanced analytics and reporting
- Weather integration for feeding adjustments

---

## Q&A

**Q:** Can the app be used on mobile devices?  
**A:** Yes, the web app is fully responsive and optimized for mobile use.

**Q:** How secure is the IoT communication?  
**A:** All MQTT communication is secured through AWS IoT Core with Cognito authentication and encrypted channels.

**Q:** Can multiple users share a feeder device?  
**A:** Yes, through the planned permissions system. Feeder owners can invite team members with different access levels (Viewer, Scheduler, Manager, Owner) to collaborate on feeder management.

**Q:** What happens if a device goes offline?  
**A:** The system tracks connection status and displays last communication time. Users receive notifications for extended offline periods.

---

## Other Considerations

- Prioritize accessibility for non-tech-savvy users
- Maintain scalability for growing user base and device inventory
- Ensure 99.9% uptime for critical feeding operations
- Plan for international expansion beyond Australia
- Maintain backward compatibility with existing IoT devices
