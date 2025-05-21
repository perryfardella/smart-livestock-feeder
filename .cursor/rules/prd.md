# PRD Consideration Rule

When working on any task or feature, always refer to the Product Requirements Document (PRD) located at `docs/prd.md`. This document contains all the essential information about the project, including:

- Timeline and release planning
- Technical stack requirements
- Core features and functionality
- User personas and scenarios
- Success metrics
- Implementation guidelines
- Out-of-scope features

## Implementation Guidelines

1. Always check if a feature is within scope of the MVP
2. Ensure all UI components use Shadcn UI for consistency
3. Follow the technical stack specifications
4. Consider mobile responsiveness in all implementations
5. Maintain security best practices, especially for authentication and payments
6. Keep the user experience simple and intuitive
7. Document any deviations from the PRD requirements

## Important Note

This rule serves as a reminder to always consult the PRD. For the most up-to-date and detailed information, always refer to the actual PRD file at `docs/prd.md`. The PRD is the source of truth for all project requirements and specifications.

## Key Points to Consider

1. **Timeline & Release Planning**

   - MVP Development: June–August 2025
   - Beta Testing: September 2025
   - Official Launch: October 2025

2. **Technical Stack**

   - Frontend: Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
   - Backend: Supabase (PostgreSQL database, Authentication)
   - Package Manager: pnpm
   - Hosting: Vercel
   - Payments: Stripe
   - Analytics: Vercel Analytics

3. **Core Features**

   - User Authentication (via Supabase)
   - Dashboard with feeder management
   - Camera integration (mocked initially)
   - Scheduling system
   - Notifications
   - Payment processing (via Stripe)

4. **User Focus**

   - Target audience: Hobby farmers and property owners in Australia
   - Primary use case: Remote monitoring and control of animal feeders
   - Focus on simplicity and accessibility for non-tech-savvy users

5. **Success Metrics**
   - 500 active users within 6 months post-launch
   - 3 logins per week per user
   - 4+ stars on feedback surveys
   - 80% retention after 3 months
   - 50% reduction in manual feeding tasks

## Out of Scope Features

Do not implement:

- Third-party weather service integration
- Advanced animal behavior analytics
- Dedicated mobile app (focus on responsive web app)
