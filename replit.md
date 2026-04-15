# feelfinance Savings Calculator

## Overview

This is a sophisticated financial planning web application built for feelfinance.at that provides comprehensive savings and retirement calculation services. The application features a Monte Carlo simulation-based savings calculator that helps users plan their financial future by projecting potential investment returns, incorporating financial goals, and providing withdrawal planning strategies.

The system combines modern web technologies with advanced financial modeling to deliver an interactive calculator that can simulate thousands of scenarios to provide realistic projections with confidence intervals, making complex financial planning accessible through an intuitive interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built using **React 18** with **TypeScript** for type safety and better developer experience. The UI framework leverages **shadcn/ui** components built on top of **Radix UI** primitives, providing a consistent and accessible design system. **Tailwind CSS** handles all styling with custom CSS variables for the feelfinance brand colors (#ee8246 primary, #f9ca00 secondary).

Key architectural decisions:
- **Component-based architecture** with clear separation of concerns between UI components, business logic, and data management
- **React Hook Form** with **Zod validation** ensures robust form handling and input validation
- **Recharts** library provides interactive data visualization for financial projections
- **Web Workers** handle computationally intensive Monte Carlo simulations to prevent UI blocking
- **Wouter** provides lightweight client-side routing

### Backend Architecture
The server uses **Express.js** with **TypeScript** running on Node.js. The architecture follows a layered approach with clear separation between routing, business logic, and data access.

Current implementation:
- **Express middleware** for request logging, JSON parsing, and error handling
- **Storage abstraction layer** with interfaces for future database integration
- **Vite integration** for development hot-reloading and production asset serving
- **Session-based architecture** prepared for user authentication (though currently using in-memory storage)

### Financial Calculation Engine
The core financial calculations use Monte Carlo simulation methodology with **2000 simulations** running in a dedicated Web Worker. The system models:
- **Monthly investment returns** with configurable volatility
- **Two investment strategies**: Ausgewogen (5% annual return) and Dynamisch (7% annual return)  
- **Inflation adjustments** (2.5% assumption)
- **Product costs** (0.99% annual fees)
- **Goal-based withdrawals** at specified future dates
- **Withdrawal planning** using both 4% rule and maximum sustainable withdrawal calculations

### Data Management
- **TanStack Query** manages client-side data fetching, caching, and synchronization
- **Zustand-like state management** through React hooks for calculator inputs and results
- **TypeScript interfaces** ensure type safety across the entire data flow
- **Zod schemas** provide runtime type validation for all user inputs

### Development and Build System
- **Vite** powers the development server with hot module replacement
- **esbuild** handles production builds for optimal performance
- **TypeScript compiler** ensures type safety across client, server, and shared code
- **Path mapping** simplifies imports with `@/` aliases for client code and `@shared/` for shared types

## External Dependencies

### Database and Storage
- **Drizzle ORM** configured for PostgreSQL with schema definitions in TypeScript
- **Neon Database** serverless PostgreSQL for production data storage
- **connect-pg-simple** for PostgreSQL-backed session storage
- Current fallback to **in-memory storage** for development

### UI and Design System
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for utility-first styling
- **Lucide React** for consistent iconography
- **Recharts** for financial data visualization and charting
- **date-fns** for date manipulation and formatting

### Financial and Mathematical Operations
- **Custom Monte Carlo simulation** engine running in Web Workers
- **jsPDF** for generating downloadable financial reports
- **Mathematical modeling** for compound interest, inflation adjustment, and risk calculations

### Development and Deployment
- **Replit** hosting environment with custom development tooling
- **Vite plugins** for runtime error handling and development cartography
- **ESLint and TypeScript** for code quality and type safety

### Analytics and Tracking  
- **Google Analytics 4** integration for user behavior tracking
- **Custom event tracking** for calculator usage, PDF downloads, and lead generation
- **Conversion tracking** for consultation bookings and user engagement

### Third-party Integrations
- **feelfinance consultation booking** system integration (https://beratung.feelfinance.at/meetings/anton-maresch)
- **Google Fonts** for Gilroy and Inter typography
- **External financial data** assumptions based on historical market data