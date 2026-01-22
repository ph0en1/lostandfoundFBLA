# School Community Lost & Found System

A comprehensive web application designed to streamline the process of reporting, searching, and claiming lost items within a school environment. Built with modern web technologies and deployed with enterprise-grade infrastructure.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
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

## 🎯 Overview

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

## ✨ Features

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

## 🛠 Technology Stack

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

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HomePage    │  │  SearchPage  │  │ AdminDashboard│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SubmitItem   │  │  LoginPage   │  │UserManagement│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                

                            
                    Supabase Client
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Supabase)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  auth.users  │  │   profiles   │  │ reporteditems│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────────────────────────┐    │
│  │  lostitems   │  │  Storage (Item Photos)           │    │
│  │  (claims)    │  │                                  │    │
│  └──────────────┘  └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```
## 📦 Installation & Setup

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

3. **Configure environment variables**

   The following environment variables are already configured in Supabase:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Public anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (keep secret!)

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Access the application**

   Open your browser to `http://localhost:5173`

### Database Setup

The database tables are automatically created on first server startup:

- `profiles` - User profile information
- `reporteditems` - Found items reported by users
- `lostitems` - Lost item claims and inquiries

The server includes automatic migration logic that syncs authentication users with the profiles table.

### Deployment

The application is designed for deployment on:

- **Frontend**: Vercel, Netlify, or similar static hosting
- **Backend**: Supabase Edge Functions (already deployed)
- **Database**: Supabase managed PostgreSQL

For production deployment to Vercel:

1. Connect your GitHub repository to Vercel
2. Configure build settings (Vite automatically detected)
3. Deploy with a single click

## 📖 User Guide

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

## 🗄 Database Schema

### Table: `profiles`

Stores user profile information synced from Supabase Auth.

| Column     | Type        | Description                        |
| ---------- | ----------- | ---------------------------------- |
| id         | uuid        | Primary key, matches auth.users.id |
| email      | text        | User's email address               |
| name       | text        | User's display name                |
| role       | text        | User role: 'student' or 'admin'    |
| status     | text        | Account status                     |
| type       | text        | Account type classification        |
| created_at | timestamptz | Account creation timestamp         |

### Table: `reporteditems`

Stores found items reported by users.

| Column      | Type        | Description                                  |
| ----------- | ----------- | -------------------------------------------- |
| id          | uuid        | Primary key                                  |
| name        | text        | Item name/title                              |
| description | text        | Detailed description                         |
| location    | text        | Where item was found                         |
| category    | text        | Item category                                |
| date        | text        | Date item was found (ISO format)             |
| status      | text        | 'pending', 'approved', 'rejected', 'claimed' |
| created_at  | timestamptz | Submission timestamp                         |

### Table: `lostitems`

Stores claim requests and lost item inquiries.

| Column      | Type        | Description                                                  |
| ----------- | ----------- | ------------------------------------------------------------ |
| id          | uuid        | Primary key                                                  |
| name        | text        | Claimer's name                                               |
| description | text        | JSON with claim details (itemId, email, phone, verification) |
| location    | text        | Reference to item ID                                         |
| category    | text        | 'CLAIM' for claim requests                                   |
| date        | text        | Claim submission date                                        |
| status      | text        | 'pending', 'approved', 'rejected', 'resolved'                |
| created_at  | timestamptz | Claim submission timestamp                                   |

### Storage Bucket: `make-4452b5a8-lost-found-photos`

Stores uploaded photos of found items.

- Private bucket with signed URL access
- Supports JPG, PNG image formats
- Automatic cleanup on item deletion

## 🔌 API Documentation

### Authentication Endpoints

#### POST `/make-server-4452b5a8/login`

Login with email and password.

**Request Body:**

```json
{
  "email": "s123456@school.edu",
  "password": "student123"
}
```

**Response:**

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "s123456@school.edu",
    "role": "student"
  }
}
```

#### POST `/make-server-4452b5a8/signup`

Create a new user account (admin only).

**Request Body:**

```json
{
  "email": "s987654@school.edu",
  "password": "securepassword"
}
```

### Items Endpoints

#### GET `/make-server-4452b5a8/items`

Retrieve all approved found items.

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "itemName": "Blue Backpack",
      "category": "Bags & Backpacks",
      "description": "Navy blue JanSport backpack",
      "location": "Library 3rd floor",
      "foundDate": "2025-01-20",
      "status": "approved",
      "createdAt": "2025-01-20T10:30:00Z"
    }
  ]
}
```

#### POST `/make-server-4452b5a8/items`

Submit a new found item.

**Request Body:**

```json
{
  "itemName": "iPhone 12",
  "category": "Electronics",
  "description": "Black iPhone with cracked screen",
  "location": "Cafeteria",
  "foundDate": "2025-01-22",
  "contactEmail": "s123456@school.edu",
  "photoData": "base64-encoded-image"
}
```

### Claims Endpoints

#### POST `/make-server-4452b5a8/claims`

Submit a claim for a found item.

**Request Body:**

```json
{
  "itemId": "uuid",
  "claimerName": "John Doe",
  "claimerEmail": "s123456@school.edu",
  "claimerPhone": "555-0123",
  "description": "My black iPhone with a distinctive case"
}
```

### Admin Endpoints

#### GET `/make-server-4452b5a8/admin/data`

Get all items and claims (admin only).

#### PUT `/make-server-4452b5a8/admin/items/:id`

Update item status (admin only).

**Request Body:**

```json
{
  "status": "approved" // or "rejected", "claimed"
}
```

#### PUT `/make-server-4452b5a8/admin/claims/:id`

Update claim status (admin only).

**Request Body:**

```json
{
  "status": "approved" // or "rejected", "resolved"
}
```

### User Management Endpoints (Admin Only)

#### GET `/make-server-4452b5a8/users/list`

List all student accounts.

#### PUT `/make-server-4452b5a8/users/:id/toggle`

Enable or disable a user account.

#### DELETE `/make-server-4452b5a8/users/:id`

Permanently delete a user account.

## 🔐 Demo Accounts

The system includes 8 pre-configured accounts for demonstration purposes:

### Student Accounts (6)

| Email              | Password   | Description       |
| ------------------ | ---------- | ----------------- |
| s123456@school.edu | student123 | Student account 1 |
| s234567@school.edu | student234 | Student account 2 |
| s345678@school.edu | student345 | Student account 3 |
| s456789@school.edu | student456 | Student account 4 |
| s567890@school.edu | student567 | Student account 5 |
| s678901@school.edu | student678 | Student account 6 |

### Admin Accounts (2)

| Email             | Password | Description             |
| ----------------- | -------- | ----------------------- |
| admin@school.edu  | admin123 | Primary admin account   |
| admin2@school.edu | admin456 | Secondary admin account |

**Note**: Additional student accounts can be created by administrators through the Admin Dashboard → Users tab.

## 💻 Development Process

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

### Architecture Decisions

#### Three-Tier Architecture

```
Frontend (React) → Server (Edge Functions) → Database (Supabase)
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

- ✅ User authentication (login/logout)
- ✅ Item submission workflow
- ✅ Search and filter functionality
- ✅ Claim submission and processing
- ✅ Admin approval workflows
- ✅ User management features
- ✅ Date validation
- ✅ Mobile responsiveness
- ✅ Error handling and edge cases

### Challenges & Solutions

#### Challenge 1: Date Validation

**Problem**: Users could submit items with future dates or very old dates.

**Solution**: Implemented dual validation:

- HTML5 `min`/`max` attributes for native browser validation
- Custom JavaScript validation with user-friendly error messages
- Server-side validation as final safeguard

#### Challenge 2: User Session Persistence

**Problem**: Users logged out on page refresh.

**Solution**: Utilized Supabase's built-in session management with automatic token refresh and localStorage persistence.

#### Challenge 3: Photo Storage

**Problem**: Storing base64 images in database led to size limitations.

**Solution**: Migrated to Supabase Storage with signed URLs for secure, scalable image hosting.

#### Challenge 4: Duplicate User Accounts

**Problem**: Migration process could create duplicate auth users.

**Solution**: Added deduplication logic on server startup that identifies and removes duplicates, keeping the oldest account.

### Code Quality

- **Consistent Formatting**: ESLint and Prettier configurations
- **Type Safety**: Strict TypeScript configuration
- **Component Structure**: Logical separation of concerns
- **Error Handling**: Try-catch blocks with user-friendly messages
- **Logging**: Comprehensive console logging for debugging

### Version Control

- Git-based version control
- Meaningful commit messages
- Feature branch workflow (recommended)

## 🔒 Security & Privacy

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

- Client-side validation for UX
- Server-side validation for security
- Email format validation
- Date range validation
- File upload restrictions (type, size)

### Privacy Considerations

- User emails only visible to admins
- Personal information not shared publicly
- Secure photo storage with signed URLs
- GDPR-compliant data deletion (user account deletion)

## 📚 Credits & Attributions

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

---

## 📄 License

This project is developed for educational purposes as part of a school project presentation.


---

**Last Updated**: January 22, 2025  
Version 1.0  