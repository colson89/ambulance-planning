# Ambulance Planning System

## Overview

The Ambulance Planning System is a web-based shift scheduling application for emergency medical services, managing 8 ambulance stations and 119 users. Built with React, TypeScript, Express, and PostgreSQL, it streamlines shift planning, scheduling, and operational management. Key capabilities include multi-station support, automated schedule generation, user preference management, holiday/weekday configurations, calendar integration, and comprehensive reporting. The system aims to be a robust and user-friendly platform for efficient daily operations, enhancing overall service delivery and reducing administrative overhead.

## User Preferences

Communication Style: Simple, everyday language. Iterative development preferred. Ask before making major changes.

Protected Files: Do not make changes to the `dist/` folder or the file `dist/public/assets/index-BiU_A5mR.js`.

Documentation Policy: **ALWAYS update `Handleiding-Ambulance-Planning.md` when adding new features or making changes to existing functionality.** This ensures end-users and IT administrators have up-to-date documentation for all system capabilities.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18+ with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom themes
- **Calendar Interface**: Dynamic, color-coded calendar views with configurable weekday/holiday settings.
- **PWA Support**: Full installable app support for iOS, Android, and desktop with offline functionality and automatic updates.

### Technical Implementations
- **Backend Runtime**: Node.js 18+ with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js (local, session-based)
- **API Design**: RESTful with protected routes and role-based access control
- **Database**: PostgreSQL 12+ (Neon Database serverless)
- **ORM**: Drizzle ORM with schema validation
- **Build Tool**: Vite

### Feature Specifications
- **Multi-Station Support**: Station-scoped entities, user accounts, and unified preference management.
- **User Management**: Role-based access control (admin/supervisor/ambulancier), password management.
- **Shift Planning System**: Supports day/night/split shifts, preference-based scheduling, automated generation with optimization algorithms, and manual override.
- **Availability Management**: Collects user preferences for monthly periods.
- **Schedule Generation**: Intelligent multi-phase algorithm considering preferences, availability, historical fairness, and conflict detection.
- **Calendar Integration**: iCal feed generation with personal tokens.
- **Reporting & Statistics**: Shift statistics by user, station, and period, with Excel export.
- **Integrations Management**: Centralized dashboard for managing external services like Verdi alarm software and Reportage Personeelsdienst.
- **Reportage Personeelsdienst**: Automated monthly shift reporting via SMTP email with Excel attachments, configurable scheduling, and recipient management.
- **Verdi Integration**: Full shift synchronization to Verdi alarm software via REST API, including station-scoped configuration and user mapping.
- **Shift Swap System**: Allows ambulanciers to request shift swaps with colleague, requiring admin/supervisor approval and supporting per-station configuration.
- **Shift Bidding System**: Allows ambulanciers to bid on open shifts, with admin/supervisor assignment and notifications.
- **Undo History System**: Allows admins/supervisors to revert recent changes to shift planning and user management, with station-scoped access.
- **Password Reset via Email**: Self-service password reset functionality, supervisor-controlled, requiring SMTP configuration and using secure, expiring tokens.

## Vriendenkring Mol Module (Separate System)

A completely separate module for "Vriendenkring VZW Brandweer Mol" - a social organization for members and their families.

### VK Module Architecture
- **Separate Authentication**: Own login system with vkAdmins table (not connected to ambulance user system)
- **Own Database Tables**: All tables prefixed with `vk_` (vkAdmins, vkMembers, vkActivities, vkSubActivities, vkPricing, vkRegistrations, vkRegistrationItems, vkMembershipTypes)
- **Own API Routes**: All routes under `/api/vk/*` in `server/vk-routes.ts`
- **Hidden Pages**: Accessed via `/VriendenkringMol` (no link in main navigation)

### VK Features
- **Member Management**: Track members with membership types (Lid VZW, Niet Lid VZW, Genodigde, Weduwe, etc.)
- **Activity Management**: Create events like "Sint Barbara 2025" with sub-activities (Avondfeest, Ontbijt, etc.)
- **Flexible Pricing**: Different prices per sub-activity per membership type
- **Public Registration**: Open registration form for activities with live price calculation
- **Stripe Payments**: Integrated checkout with Bancontact, iDEAL, and card payments
- **Admin Dashboard**: Overview of registrations, payments, and statistics
- **Membership Fee System**: Annual fee collection with cycles, payment deadlines, automatic reminders (7/3/1 days before), late payment penalties, and Stripe online payment

### VK URLs
- `/VriendenkringMol` - Admin login
- `/VriendenkringMol/admin` - Admin dashboard
- `/VriendenkringMol/inschrijven` - Public registration form
- `/VriendenkringMol/lidgeld/:token` - Public membership fee payment page

### VK Stripe Integration
Connected to: **vriendenkring.vzwbrandweermol@gmail.com**
Uses Replit Stripe connector for secure credential management.

### System Design Choices
- **Database Schema**: Multi-station support with normalized tables for users, shifts, preferences, configurations, holidays, and weekdays.
- **Deployment**: Pre-compiled backend and static frontend assets. Designed for VM deployment (Linux/Ubuntu, Windows Server) and Docker-ready, using PM2 and Nginx.

## External Dependencies

- **Database**:
  - `@neondatabase/serverless`
  - `pg`
  - `drizzle-orm`, `drizzle-kit`

- **Frontend Core**:
  - `react`, `react-dom`
  - `@tanstack/react-query`
  - `@radix-ui/***`
  - `wouter`

- **Backend Core**:
  - `express`, `express-session`
  - `passport`, `passport-local`
  - `connect-pg-simple`, `memorystore`

- **Utilities & Other**:
  - `typescript`
  - `date-fns`
  - `nanoid`
  - `zod`, `drizzle-zod`
  - `vite`, `@vitejs/plugin-react`
  - `xlsx`, `exceljs`
  - `ws`
  - `dotenv`
  - `nodemailer`