# Ambulance Planning System

## Overview

The Ambulance Planning System is a web-based shift scheduling application designed for emergency medical services (ambulance stations). It's built with a modern full-stack architecture using React frontend, Express.js backend, and PostgreSQL database with multi-station support.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom theme support
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js 18+ with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful API with protected routes and role-based access control

### Database Architecture
- **Database**: PostgreSQL 12+ with Drizzle ORM
- **Connection**: Neon Database serverless connection with WebSocket support
- **Schema**: Multi-station support with normalized tables for users, shifts, preferences, and configurations

## Key Components

### Multi-Station Support
- Stations table with unique codes and display names
- All entities (users, shifts, preferences) are station-scoped
- Station selection interface for login process

### User Management
- Role-based access control (admin/ambulancier)
- Station-specific user accounts
- Password management with scrypt hashing
- Admin contact information system

### Shift Planning System
- Day and night shift types with configurable hours
- Split shift support for partial coverage
- Preference-based scheduling with availability tracking
- Automated schedule generation with optimization algorithms
- Deadline-based preference submission

### Availability Management
- User preference collection for monthly periods
- Support for full, partial (first/second half), and unavailable preferences
- Comment support for special circumstances
- Visual calendar interface for preference input

### Schedule Generation
- Intelligent algorithm considering user preferences and availability
- Weekend and weekday configuration support
- Open slot detection and warning system
- Manual override capabilities for administrators

## Data Flow

### Authentication Flow
1. Station selection from available stations
2. User login with station context
3. Session creation with user and station information
4. Role-based route protection

### Preference Submission Flow
1. User selects month/year for preferences
2. Calendar interface shows available dates
3. Preference types: full day, first/second half, unavailable
4. Deadline validation prevents late submissions
5. Database storage with user and station context

### Schedule Generation Flow
1. Admin initiates schedule generation for specific month
2. System collects all user preferences for the period
3. Algorithm optimizes assignments based on preferences and constraints
4. Generated schedule presented with coverage analysis
5. Manual adjustments possible before finalization

### Statistics and Reporting
1. Data aggregation across time periods
2. User workload analysis and preference vs. actual comparison
3. Excel export functionality for external reporting
4. Station-specific metrics and trends

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: TypeScript ORM with schema validation
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **passport**: Authentication middleware
- **express-session**: Session management
- **date-fns**: Date manipulation and formatting

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Development server and build tool
- **tailwindcss**: Utility-first CSS framework

### Optional Integrations
- **xlsx**: Excel file generation for reporting
- **ws**: WebSocket support for Neon database
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Production Environment
- **Process Manager**: PM2 for application lifecycle management
- **Web Server**: Nginx as reverse proxy (recommended)
- **Database**: PostgreSQL 12+ or Neon Database serverless
- **Environment**: Ubuntu/Debian server with Node.js 18+

### Configuration Management
- Environment variables for database connection and secrets
- Station-specific configuration through database settings
- Configurable deadlines and shift parameters
- System settings for operational parameters

### Update Strategy
- Automated backup before updates
- Database schema migrations with data preservation
- Rolling updates with zero-downtime deployment
- Rollback capabilities for failed deployments

### Multi-Platform Support
- Linux/Ubuntu primary deployment target
- Windows Server support with service installation
- Docker containerization ready (configuration available)
- Cloud platform deployment (DigitalOcean, Hetzner, etc.)

## Changelog
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.