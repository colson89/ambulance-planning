# Ambulance Planning System

## Overview

The Ambulance Planning System is a web-based shift scheduling application designed for emergency medical services, specifically for managing 8 ambulance stations and 119 users. Built with React, TypeScript, Express, and PostgreSQL, its primary purpose is to streamline shift planning, scheduling, and operational management. The system offers multi-station support, automated schedule generation, user preference management, holiday and weekday configurations, calendar integration, and comprehensive reporting, aiming to provide a robust and user-friendly platform for efficient daily operations.

## User Preferences

Communication Style: Simple, everyday language. Iterative development preferred. Ask before making major changes.

Protected Files: Do not make changes to the `dist/` folder or the file `dist/public/assets/index-BiU_A5mR.js`.

## System Architecture

### Frontend
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom themes
- **Build Tool**: Vite
- **Calendar Interface**: Dynamic, color-coded calendar views with configurable weekday/holiday settings.

### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js (local strategy, session-based)
- **Session Storage**: PostgreSQL-backed (connect-pg-simple) or in-memory (memorystore)
- **API Design**: RESTful with protected routes and role-based access control
- **Database Connection**: PostgreSQL connection pooling (`pg.Pool`).

### Database
- **Database**: PostgreSQL 12+ (specifically Neon Database serverless with WebSocket support)
- **ORM**: Drizzle ORM with schema validation
- **Schema**: Multi-station support with normalized tables for users, shifts, preferences, configurations, holidays, and weekdays.
- **Migrations**: Schema changes managed via `npm run db:push`.

### Key Features
- **Multi-Station Support**: Station-scoped entities, user accounts, and unified preference management across 8 stations.
- **User Management**: Role-based access control (admin/supervisor/ambulancier), password management with scrypt, and admin contact system.
- **Shift Planning System**: Supports day/night and split shifts, preference-based scheduling, automated generation with optimization algorithms (including weekend-first, historical fairness, workload balancing, 12-hour rest enforcement, professional restrictions), and manual override capabilities.
- **Availability Management**: Collects user preferences for monthly periods (full, partial, unavailable) with comments and visual calendar input.
- **Schedule Generation**: Intelligent multi-phase algorithm considering user preferences, availability, historical fairness, scarcity-based prioritization, and conflict detection.
- **Calendar Integration**: iCal feed generation with personal tokens and CORS support for external calendar applications.
- **Reporting & Statistics**: Shift statistics by user, station, and period, with Excel export and workload analysis.

### Build & Deployment
- **Pre-built Application**: Deployed as pre-compiled backend (`dist/index.js`) and static frontend assets (`dist/public/`).
- **Production Mode**: Serves assets on port 5000.
- **Environment**: Designed for VM deployment, with specific environment variables for public-facing URLs (e.g., `PUBLIC_URL` for Windows Server deployments).
- **Deployment Strategy**: Recommended use of PM2 for process management and Nginx as a reverse proxy. Supports Linux/Ubuntu, Windows Server, and is Docker-ready.

## External Dependencies

- **Database**:
  - `@neondatabase/serverless`: PostgreSQL connection for serverless environments.
  - `pg`: PostgreSQL client for Node.js.
  - `drizzle-orm`, `drizzle-kit`: ORM and migration tools.

- **Frontend Core**:
  - `react`, `react-dom`: UI library.
  - `@tanstack/react-query`: Server state management.
  - `@radix-ui/***`: Accessible UI component primitives.
  - `wouter`: Lightweight client-side routing.

- **Backend Core**:
  - `express`, `express-session`: Web framework and session management.
  - `passport`, `passport-local`: Authentication middleware.
  - `connect-pg-simple`, `memorystore`: Session stores.

- **Utilities & Other**:
  - `typescript`: Language.
  - `date-fns`: Date manipulation.
  - `nanoid`: Unique ID generation.
  - `zod`, `drizzle-zod`: Schema validation.
  - `vite`, `@vitejs/plugin-react`: Build tool.
  - `xlsx`: Excel file generation.
  - `ws`: WebSocket support.
  - `dotenv`: Environment variable management.