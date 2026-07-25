# School Community Lost & Found System

A comprehensive web application designed to streamline the process of reporting, searching, and claiming lost items within a school environment.

Built for 2025-2026 FBLA Web Development Challenge


##  Overview

The School Lost & Found System is a web application that addresses the common problem of lost items in educational institutions. The platform provides a centralized database of found items with administrative oversight, and an intuitive user interface.


##  Features

### For Students

- **Browse Found Items**: Search and filter through approved found items
- **Advanced Search**: Filter by category, location, date range, and keywords
- **Report Found Items**: Submit detailed reports with photos for items they've found
- **Claim Items**: Submit claim requests with verification details
- **Real-time Validation**: Date validation ensures accuracy (within 1 year, no future dates)

### For Administrators

- **Comprehensive Dashboard**: Overview of pending items, claims, and user statistics
- **Item Moderation**: Approve or reject submitted found items
- **Claim Management**: Review and process claim requests
- **User Management**:
  - Create new student accounts
  - Enable/disable user accounts
  - Delete user accounts
- **Activity Monitoring**: Track all system activities and user actions

##  App Infrastructure

### Frontend

- **React 18** - Component-based UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI component library
- **Vite** - Next-generation frontend build tool
- **Lucide React** - Modern icon library

### Backend

- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL Database
  - Authentication & Authorization
  - Storage (for item photos)
  - Edge Functions (Deno runtime)
- **Hono** - Fast web framework for Edge Functions
- **Deno** - Secure JavaScript/TypeScript runtime

### Infrastructure

- **Supabase Cloud** - Hosted database and auth
- **Edge Functions** - Serverless API endpoints
- **CDN** - Global content delivery for static assets


##  Installation & Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (free tier available)
- Git

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd school-lost-found
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Access the application**

   Open your browser to `http://localhost:5173`

OR 

visit https://lostandfoundacp.netlify.app for live app

## Credits & Attributions

### Learning Resources

- React Documentation - https://react.dev/
- Supabase Documentation - https://supabase.com/docs
- TypeScript Documentation - https://www.typescriptlang.org/docs/
- Tailwind CSS Documentation - https://tailwindcss.com/docs
- Youtube tutorials & crash courses - https://youtu.be
- Stack overflow for debugging - https://stackoverflow.com

---

##  License

This project is developed for educational purposes as part of a school project presentation.


---

**Last Updated**: January 22, 2025  
Version 1.0  
