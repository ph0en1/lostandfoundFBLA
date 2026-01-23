# School Community Lost & Found System

A comprehensive web application designed to streamline the process of reporting, searching, and claiming lost items within a school environment. Built with modern web technologies and deployed with enterprise-grade infrastructure.

##  Table of Contents

- [Overview](#overview)
- [Features](#features)
- [App Infrastructure](#technology-stack)
- [System Architecture](#system-architecture)
- [Installation & Setup](#installation--setup)
- [User Guide](#user-guide)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Demo Accounts](#demo-accounts)
- [Development Process](#development-process)
- [Security & Privacy](#security--privacy)
- [Future Enhancements](#future-enhancements)
- [Credits & Attributions](#credits--attributions)

##  Overview

The School Lost & Found System is a full-stack web application that addresses the common problem of lost items in educational institutions. The platform provides a centralized, searchable database of found items with role-based access controls, administrative oversight, and an intuitive user interface.

### Problem Statement

Traditional lost-and-found systems often rely on physical bulletin boards or manual record-keeping, making it difficult for students to:

- Search for their lost items efficiently
- Receive timely notifications about found items
- Verify ownership and claim items

### Solution

Our digital platform provides:

- **Centralized Database**: All found items stored in a searchable, cloud-based database
- **Photo Evidence**: Visual confirmation through uploaded photos
- **Admin Moderation**: Quality control through admin approval workflow
- **Role-Based Access**: Different permissions for students and administrators
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

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

### Security Features

- **Authentication**: Secure login system using Supabase Auth
- **Role-Based Access Control (RBAC)**: Separate permissions for students and admins
- **Session Management**: Automatic session handling and token refresh
- **Data Validation**: Server-side and client-side validation for all inputs
- **Protected Routes**: API endpoints secured with authentication middleware

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

### Database Setup

The database tables are automatically created on first server startup:

- `profiles` - User profile information
- `reporteditems` - Found items reported by users
- `lostitems` - Lost item claims and inquiries

### Deployment

The application is designed for deployment on:

- **Frontend**: Vercel, Netlify, or similar static hosting
- **Backend**: Supabase Edge Functions (already deployed)
- **Database**: Supabase managed PostgreSQL

For production deployment to Vercel:

1. Connect your GitHub repository to Vercel
2. Configure build settings (Vite automatically detected)
3. Deploy with a single click

##  User Guide

### For Students

#### Browsing Items

1. Navigate to "Search Lost Items" from the home page
2. Use filters to narrow down results:
   - **Category**: Electronics, Clothing, Books, etc.
   - **Location**: Where the item was found
   - **Date Range**: When the item was found
   - **Search**: Keywords in item name or description

#### Reporting a Found Item

1. Click "Report Found Item" on the home page
2. Fill out the form:
   - Item name (required)
   - Category (required)
   - Description (optional but recommended)
   - Location where found (required)
   - Date found (required - must be within last year, no future dates)
   - Photo (optional)
3. Submit for admin review
4. Wait for admin approval before item appears publicly

#### Claiming an Item

1. Find your lost item in the search results
2. Click "Claim This Item"
3. Fill out the claim form:
   - Your name
   - Contact email
   - Phone number (optional)
   - Verification details (describe the item to prove ownership)
4. Submit claim for admin review

### For Administrators

#### Accessing Admin Dashboard

1. Login with an admin account (admin@school.edu or admin2@school.edu)
2. Click "Admin Dashboard" from the home page
3. View statistics and pending items

#### Managing Found Items

1. Go to "Found Items" tab
2. Review pending submissions
3. Click "Approve" to make item publicly visible
4. Click "Reject" to decline the submission

#### Processing Claims

1. Go to "Claims" tab
2. Review claim details and verification information
3. Actions available:
   - **Approve**: Confirm the claim is valid
   - **Reject**: Deny the claim
   - **Mark as Resolved**: Close the claim after item is returned

#### Managing Users

1. Go to "Users" tab
2. View all student accounts
3. Available actions:
   - **Add Student**: Create new student account
   - **Disable**: Prevent user from logging in
   - **Enable**: Restore user access
   - **Delete**: Permanently remove user account



##  Development Process

### Design Decisions

#### Why React + TypeScript?

- **Type Safety**: TypeScript catches errors at compile time, reducing runtime bugs
- **Component Reusability**: React's component model promotes DRY principles
- **Large Ecosystem**: Access to extensive libraries and tooling

#### Why Supabase?

- **Rapid Development**: Auth, database, and storage in one platform
- **PostgreSQL**: Robust, ACID-compliant relational database
- **Edge Functions**: Deploy serverless API close to users globally
- **Real-time Capabilities**: Built-in support for live data updates (future feature)

#### Why Tailwind CSS?

- **Utility-First**: Rapid UI development without leaving HTML
- **Consistency**: Design system built into utility classes
- **Performance**: Purges unused CSS in production
- **Responsive Design**: Mobile-first approach built-in

### Website Architecture


```
React → Edge Function → Supabase
```

**Benefits:**

- Clear separation of concerns
- Independent scaling of each layer
- Security: Database credentials never exposed to client
- Flexibility: Can swap out any layer independently

#### Role-Based Access Control (RBAC)

- User roles stored in auth metadata and profiles table
- Server-side enforcement of permissions
- Different UI components rendered based on role

#### State Management

- React `useState` and `useEffect` for local component state
- No global state management needed (kept simple)
- Server as source of truth for all data

### Testing Strategy

Manual testing performed for:

-  User authentication (login/logout)
-  Item submission workflow
-  Search and filter functionality
-  Claim submission and processing
-  Admin approval workflows
-  User management features
-  Date validation
-  Mobile responsiveness
-  Error handling and edge cases


### Version Control

- Git-based version control
- Meaningful commit messages
- Feature branch workflow (recommended)

##  Security & Privacy

### Authentication

- Passwords hashed with bcrypt (handled by Supabase Auth)
- JWT tokens with automatic expiration
- Session refresh tokens for persistent login

### Authorization

- Role-based access control enforced on server
- Admin routes protected with authentication middleware
- User data isolated by authentication

### Data Protection

- HTTPS encryption for all communications
- Environment variables for sensitive credentials
- Service role key never exposed to client
- SQL injection protection via parameterized queries

### Input Validation

- Client-side validation
- Server-side validation for security
- Email format validation
- Date range validation
- File upload restrictions (type, size)

### Privacy Considerations

- User emails only visible to admins
- Personal information not shared publicly
- Secure photo storage with signed URLs
- GDPR-compliant data deletion (user account deletion)

## Credits & Attributions

### Technologies Used

- **React** - Meta Platforms, Inc. (MIT License)
- **TypeScript** - Microsoft Corporation (Apache 2.0 License)
- **Tailwind CSS** - Tailwind Labs (MIT License)
- **shadcn/ui** - shadcn (MIT License)
- **Lucide Icons** - Lucide Contributors (ISC License)
- **Supabase** - Supabase, Inc. (Apache 2.0 License)
- **Hono** - Yusuke Wada (MIT License)
- **Vite** - Evan You (MIT License)


### UI Components

This project uses components from [shadcn/ui](https://ui.shadcn.com/), which are built with:

- Radix UI primitives
- Tailwind CSS
- TypeScript

### Development Tools

- **Node.js**
- **pnpm**
- **Git**

### Learning Resources

- React Documentation - https://react.dev/
- Supabase Documentation - https://supabase.com/docs
- TypeScript Documentation - https://www.typescriptlang.org/docs/
- Tailwind CSS Documentation - https://tailwindcss.com/docs
- Youtube tutorials & crash courses - https://youtu.be
- Stack overflow for debugging - https://stackoverflow.com
- 

---

##  License

This project is developed for educational purposes as part of a school project presentation.


---

**Last Updated**: January 22, 2025  
Version 1.0  
