# UniDesk Backend

A RESTful backend API for UniDesk, a learning management platform designed to facilitate academic activities between students, faculty and adminis. Built with Node.js, Express, MongoDB and Socket.IO.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Authentication & Authorization](#authentication--authorization)
- [API Reference](#api-reference)
  - [User Management](#user-management)
  - [Course Management](#course-management)
  - [Announcements](#announcements)
  - [Study Materials](#study-materials)
  - [Assignments](#assignments)
  - [Schedule](#schedule)
  - [Appointments](#appointments)
  - [Conversations & Messaging](#conversations--messaging)
  - [Supervisor Management](#supervisor-management)
  - [Repository](#repository)
  - [Notifications](#notifications)
- [Real-Time Features (Socket.IO)](#real-time-features-socketio)
- [Testing](#testing)
- [CI/CD](#cicd)

---

## Overview

The platform supports in-app notifications, real-time Socket.IO events, and email delivery for selected notification types.

UniDesk Backend serves as the core API layer for a university desk application. It supports three user roles — **Admin**, **Faculty** and **Student** — each with a distinct set of permissions. The system handles everything from course and assignment management to real-time chat, appointment scheduling and a shared academic repository.

---

## Tech Stack

| Layer            | Technology                        |
|------------------|-----------------------------------|
| Runtime          | Node.js                           |
| Framework        | Express.js                        |
| Database         | MongoDB with Mongoose             |
| TokenService     | Firebase Admin SDK                |
| File Storage     | Cloudinary                        |
| Real-Time        | Socket.IO                         |
| Email            | Nodemailer                        |
| Scheduled Jobs   | node-cron                         |
| Testing          | Jest, Supertest, mongodb-memory-server |

---

## Project Structure

```
UniDesk_Backend/
├── src/
│   ├── index.js                  # Entry point, HTTP server, Socket.IO setup
│   ├── app.js                    # Express app, middleware, route mounting
│   ├── config/
│   │   ├── db/                   # MongoDB connection
│   │   └── cloudinary/           # Cloudinary configuration
│   ├── controllers/              # Business logic, one folder per domain
│   │   ├── AnnouncementController/
│   │   ├── AppointmentController/
│   │   ├── AssignmentController/
│   │   ├── ConversationController/
│   │   ├── CourseController/
│   │   ├── NotificationController/
│   │   ├── RepositoryController/
│   │   ├── ScheduleController/
│   │   ├── StudyMaterialController/
│   │   ├── SupervisorController/
│   │   └── UserController/
│   ├── models/                   # Mongoose schemas
│   │   ├── AnnouncementModel/
│   │   ├── AppointmentModel/
│   │   ├── AssignmentModel/
│   │   ├── AssignmentSubmissionModel/
│   │   ├── ContributionLeaderboardModel/
│   │   ├── ConversationModel/
│   │   ├── CourseModel/
│   │   ├── MessageModel/
│   │   ├── NotificationModel/
│   │   ├── RepositoryModel/
│   │   ├── ScheduleModel/
│   │   ├── StudyMaterialModel/
│   │   ├── SupervisorModel/
│   │   └── UserModel/
│   ├── routes/                   # Express route definitions
│   ├── middlewares/
│   │   ├── Auth/                 # Firebase token verification
│   │   └── Role/                 # Role-based access control
│   ├── utils/                    # Helper utilities
│   │   ├── CloudinaryValidation/
│   │   ├── DeleteFromCloudinary/
│   │   ├── Email/
│   │   │   ├── sendEmail.js
│   │   │   └── sendNotificationEmail.js
│   │   ├── Firebase/
│   │   ├── FormatName/
│   │   ├── HelperFunctionsForScheduleUpdate/
│   │   ├── InvitationCode/
│   │   ├── MeetLinkGeneration/
│   │   ├── NotificationEngine/
│   │   └── ToMinuteTime/
│   └── cron/
│       └── reminderJobs.js       # Scheduled background jobs
├── tests/
│   ├── unit/
│   │   ├── controllers/          # Unit tests for all controllers
│   │   └── utils/                # Unit tests for utility functions
│   ├── integration/
│   │   ├── Routes/               # Integration tests for all route groups
│   │   ├── helpers/
│   │   └── setup/
│   └── setup/                    # Global test setup (in-memory DB)
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI/CD pipeline
├── .env                          # Environment variables (not committed)
├── package.json
```

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Frontend URL
LIVE_LINK=http://localhost:5173

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Timezone
TZ=Asia/Dhaka

# SMTP for email notification

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="UniDesk <your_email@gmail.com>"
```

`SMTP_FROM` should use a full sender format such as `UniDesk <your_email@gmail.com>`.

If you use Gmail SMTP, use a Google App Password instead of your normal account password.

Firebase Admin credentials are loaded from `unideskFBAdmin.json`. Place this file in the project root (do not commit it).

---

## Getting Started

**Prerequisites:** Node.js >= 18, a MongoDB Atlas cluster, a Firebase project, and a Cloudinary account.

```bash
# 1. Clone the repository
git clone https://github.com/Samioul51/UniDesk_Backend.git
cd UniDesk_Backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Copy the example above into a .env file and fill in your credentials
# Email notifications require the SMTP variables above

# 4. Start the development server
npm run dev

# 5. For production
npm start
```

The server runs on port `3000` by default (configurable via `PORT` in `.env`).

---

## Authentication & Authorization

All protected routes follow a two-step middleware chain:

1. **`verifyFirebaseToken`** — Validates the Firebase ID token sent in the `Authorization` header as a Bearer token. Attaches the decoded user information to `req.user`.

2. **`verifyRole([...roles])`** — Checks that the authenticated user's role matches one of the allowed roles for that route. Supported roles are `admin`, `faculty`, and `student`.

```
Authorization: Bearer <firebase_id_token>
```

---

## API Reference

All endpoints are prefixed with `/api`.

---

### User Management

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/users/account-status` | Any authenticated | Check own account status |
| PATCH | `/users/account-status/verify` | Any authenticated | Verify a pending account |
| POST | `/users` | Any authenticated | Create a new user profile |
| GET | `/admin/users` | admin | Get all users |
| GET | `/users/id/:id` | Any authenticated | Get a user by MongoDB ID |
| GET | `/users/:email` | admin, student, faculty | Get a single user by email |
| PATCH | `/users/profile/:email` | student, faculty | Update own profile |
| PATCH | `/admin/users/:email` | admin | Admin updates any user profile |
| DELETE | `/admin/users/:email` | admin | Delete a user |

---

### Course Management

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/courses` | faculty | Create a new course |
| POST | `/courses/student/join` | student | Join a course via invitation code |
| POST | `/courses/faculty/join` | faculty | Join a course as co-faculty via invitation code |
| GET | `/admin/courses` | admin | Get all courses |
| GET | `/courses/my-courses` | faculty, student | Get courses the authenticated user belongs to |
| GET | `/courses/:id` | faculty, student, admin | Get a single course |
| PATCH | `/courses/:id` | faculty | Update course details |
| DELETE | `/courses/:id/student/leave` | student | Leave a course |
| DELETE | `/courses/:id/faculty/leave` | faculty | Leave a course |
| DELETE | `/courses/:courseId/students/:studentId` | faculty | Remove a student from a course |

---

### Announcements

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/course/:id/announcement` | faculty | Create an announcement for a course |
| PATCH | `/course/:courseID/announcement/:announcementID` | faculty | Update an announcement |
| GET | `/course/:id/announcements` | faculty, student | Get all announcements for a course |
| DELETE | `/course/announcement/:id` | faculty | Delete an announcement |

---

### Study Materials

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/course/:id/material` | faculty | Upload a study material to a course |
| GET | `/course/:id/materials` | faculty, student | Get all materials for a course |
| DELETE | `/course/material/:id` | faculty | Delete a study material |

---

### Assignments

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/course/:id/assignments` | faculty, student | Get all assignments for a course |
| POST | `/course/:id/assignment` | faculty | Upload a new assignment |
| GET | `/course/:courseID/assignment/:assignmentID` | faculty, student | Get a single assignment |
| DELETE | `/assignment/:id` | faculty | Delete an assignment |
| PATCH | `/assignment/:id` | faculty | Update an assignment |
| POST | `/assignment/:id/submit` | student | Submit an assignment |
| GET | `/assignment/:id/submissions` | faculty | Get all submissions for an assignment |
| PATCH | `/assignment/:id/submissions/:submissionId` | faculty | Grade a submission |
| DELETE | `/submission/:id` | student | Unsubmit (retract) a submission |
| POST | `/submission/recheck/:id` | student | Request a recheck of a graded submission |
| PATCH | `/submission/recheck/:id` | faculty | Resolve a recheck request |
| GET | `/submission/faculty/pending` | faculty | Get all assignments pending grading |

---

### Schedule

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/schedule` | faculty, admin | Create a faculty schedule |
| PATCH | `/schedule` | faculty, admin | Update a faculty schedule |
| GET | `/schedule/:id` | faculty, admin, student | Get a faculty's schedule |

---

### Appointments

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/appointment` | student | Book an appointment with a faculty |
| GET | `/appointment/student/:id` | student | Get all appointments for a student |
| GET | `/appointment/faculty/:id/week` | faculty | Get current week's approved appointments |
| GET | `/appointment/faculty/:id` | faculty | Get all appointments for a faculty |
| PATCH | `/appointment/:id` | student, faculty | Update appointment status |
| GET | `/appointment/:id` | student, faculty | Get a single appointment |

---

### Conversations & Messaging

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/conversation` | student, faculty | Start a new conversation |
| GET | `/conversation/user/:id` | student, faculty | Get all conversations for a user |
| GET | `/conversation/messages/:conversationID` | student, faculty | Get all messages in a conversation |
| GET | `/conversation/:id` | student, faculty | Get a specific conversation |
| POST | `/messages` | student, faculty | Send a message |
| PATCH | `/messages/read/:conversationID` | student, faculty | Mark messages as read |

---

### Supervisor Management

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/supervisor` | faculty, admin | Assign a supervisee to a faculty |
| GET | `/supervisor/student/:studentID` | student, admin | Get a student's supervisors |
| GET | `/supervisor/:supervisorID` | faculty, admin | Get all supervisees of a faculty |
| PATCH | `/supervisor/:supervisorID` | faculty, admin | Update supervisee status |
| DELETE | `/supervisor/:supervisorID` | faculty, admin | Remove a supervisee |
| POST | `/supervisor/:supervisorID/contact` | faculty | Batch contact supervisees |

---

### Repository

A shared academic resource hub open for all authenticated users to contribute and browse.

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | `/repository` | admin, student, faculty | Upload a repository item |
| GET | `/repository` | Public | Get all repository items |
| GET | `/repository/leaderboard` | Public | Get contribution leaderboard |
| GET | `/repository/:id` | admin, student, faculty | Get a single repository item |
| PATCH | `/repository/:id` | admin | Update item status (approve/reject) |
| DELETE | `/repository/:id` | admin, faculty, student | Delete a repository item |

---

### Notifications

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/notifications` | admin, faculty, student | Get all notifications for the authenticated user |
| GET | `/notifications/unread` | admin, faculty, student | Get unread notification count |
| PATCH | `/notifications/all` | admin, faculty, student | Mark all notifications as read |
| PATCH | `/notifications/:id` | admin, faculty, student | Mark a single notification as read |

Notifications are always stored in the database and emitted over Socket.IO in real time.

Email delivery is enabled only for selected notification types such as announcements, study materials, assignments, grading updates, appointment updates, reminders, repository approval, and supervisor-related contact notifications.

Chat message notifications remain in-app only.

---

## Real-Time Features (Socket.IO)

The server exposes a Socket.IO instance alongside the HTTP server. Clients can connect to handle real-time communication.

| Event (Client -> Server) | Payload | Description |
|--------------------------|---------|-------------|
| `join` | `userID` | Join a personal room to receive targeted events |
| `checkOnline` | `userID` | Check if a specific user is currently online |
| `typing` | `{ conversationID, receiverID }` | Notify the receiver that the sender is typing |
| `stopTyping` | `{ conversationID, receiverID }` | Notify the receiver that typing has stopped |

| Event (Server -> Client) | Payload | Description |
|--------------------------|---------|-------------|
| `userOnline` | `userID` | Broadcast when a user comes online |
| `userOffline` | `userID` | Broadcast when a user goes offline (with a 3-second grace period) |
| `onlineStatus` | `{ userID, isOnline }` | Response to a `checkOnline` request |
| `typing` | `{ conversationID }` | Delivered to the receiver's room |
| `stopTyping` | `{ conversationID }` | Delivered to the receiver's room |

---

## Testing

The project has a comprehensive test suite covering all 11 domain modules at both the unit and integration levels.

**Test Structure:**

```
tests/
├── unit/
│   ├── controllers/       # Mocked unit tests for each controller
│   └── utils/             # Unit tests for utility functions
└── integration/
    ├── Routes/            # Full HTTP request tests using Supertest
    ├── helpers/           # Shared test helpers
    └── setup/             # Integration test DB setup
```

**Run Tests:**

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run all tests with coverage report
npm run test:ci
```

Integration tests use `mongodb-memory-server` to spin up an in-memory MongoDB instance, ensuring tests are isolated from the production database.

Tests primarily verify the in-app notification flow. Real email delivery depends on valid SMTP credentials in the runtime environment.

---

## CI/CD

A GitHub Actions pipeline (`ci.yml`) runs automatically on every push or pull request targeting the `main` or `develop` branches.

**Pipeline steps:**

1. Checkout code
2. Setup Node.js (tested against Node 18 and Node 20 via matrix strategy)
3. Install dependencies with `npm ci`
4. Run full test suite with coverage (`npm run test:ci`)

The pipeline ensures that all changes are verified across multiple Node.js versions before merging.
