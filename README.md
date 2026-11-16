# UBPMS - University Project Management System

A comprehensive web application designed to streamline and automate the entire final-year project lifecycle within academic institutions.

## 🎓 Overview

**UBPMS (University Project Management System)** is a full-stack web application that digitizes and automates the complete lifecycle of final-year academic projects in universities and colleges. The system serves as a centralized platform where students can submit project proposals, upload their work at various stages (Alpha, Beta, and Final submissions), and communicate with their supervisors, while lecturers can review proposals, manage their supervisees, grade submissions using rubric-based evaluation, and provide feedback. Coordinators benefit from comprehensive administrative tools including academic year configuration, deadline management, user administration, presentation scheduling, and detailed analytics and reporting. Built with modern technologies including React, TypeScript, Node.js, Express, and MySQL, UBPMS replaces traditional paper-based workflows with a secure, efficient digital solution that includes features such as proposal similarity checking, real-time notifications, direct messaging, file upload management, and comprehensive audit trails, ensuring transparency, accountability, and improved collaboration throughout the entire project management process.

UBPMS replaces manual, paper-based processes with a secure, efficient digital platform that manages:
- Project proposals and topic submission
- Supervisor assignment and management
- Proposal similarity checking to flag duplicate topics
- Document submission at each project stage
- Grading and evaluation
- Communication between students and supervisors
- Analytics and reporting for coordinators

## 🚀 Features

### For Students
- Submit project proposals with supervisor preferences
- See similar existing proposals before submitting, so the description can be revised
- Upload documents (Alpha, Beta, Final) at each project stage
- Track submission status and deadlines
- View grades and feedback
- Direct messaging with supervisors

### For Lecturers
- Review and approve/reject project proposals
- Manage supervisees and track their progress
- Grade submissions with rubric-based scoring
- View upcoming presentations
- Communicate with students

### For Coordinators
- Configure academic year settings and deadlines
- Monitor overall submission statistics
- See similarity scores and alerts for proposals
- Manage users and supervisor capacities
- Schedule presentations
- Generate reports and analytics
- Broadcast announcements

## 🔍 Proposal Similarity Checker

UBPMS checks new project proposals for overlap with existing ones, so that two students don't propose the same project.

- **What is compared:** the proposal description, against proposals from the current and previous 2 academic years that are submitted, under review or approved (rejected proposals are not included).
- **How:** the backend compares the text itself, using word overlap, shared phrases and shared technical terms. No external service or API is used.
- **When a student clicks Next** on the proposal form, any existing proposals that are 30% or more similar are shown, so the student can revise the description.
- **When a student submits**, the submission is blocked if the description is 25% or more similar to an existing proposal, and the student receives a notification.
- **Coordinators** see similarity scores and alerts for proposals on their dashboard and on the proposals management page.

Only proposal descriptions are checked. Uploaded documents (Alpha, Beta and Final submissions) are not checked for plagiarism.

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** MySQL
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer

### Frontend
- **Framework:** React 18 with TypeScript
- **UI Library:** Material-UI (MUI) v5
- **State Management:** React Query (TanStack Query)
- **Routing:** React Router v6
- **Forms:** Formik with Yup validation
- **Charts:** Recharts
- **Build Tool:** Vite

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

## 🔧 Installation

### 1. Clone the repository

```bash
git clone https://github.com/Jesutofunmiabby/ub-project-management-system.git
cd ub-project-management-system
```

### 2. Set up the database

Make sure MySQL 8 is running. The migration step creates the `ubpms` database if it doesn't already exist.

### 3. Configure environment variables

Copy the example file and fill in your own values:

```bash
cd backend
cp .env.example .env
```

At minimum, set `DB_PASSWORD` to your MySQL password and `JWT_SECRET` to a long random string. Every setting is explained in [`backend/.env.example`](backend/.env.example). The `.env` file is ignored by git, so never commit it.

### 4. Install backend dependencies

```bash
npm install
```

### 5. Run database migrations

```bash
npm run migrate
```

### 6. Seed the database with test data

```bash
npm run seed
```

### 7. Start the backend server

```bash
npm run dev
```

### 8. Install frontend dependencies

Open a new terminal:

```bash
cd frontend
npm install
```

### 9. Start the frontend development server

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001/api

The frontend dev server forwards `/api` requests to the backend on port 5001.

## 🔐 Demo Accounts

After seeding the database, you can log in with these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Coordinator | coordinator@university.edu | Password123 |
| Lecturer | j.smith@university.edu | Password123 |
| Lecturer | s.johnson@university.edu | Password123 |
| Student | alice.anderson@student.edu | Password123 |
| Student | bob.baker@student.edu | Password123 |

## 📁 Project Structure

```
UBPMS/
├── backend/
│   ├── src/
│   ├── migrations/         # Extra SQL migration files
│   ├── src/
│   │   ├── config/         # Database and environment config
│   │   ├── controllers/    # Route controllers
│   │   ├── database/       # Migration, seed and setup scripts
│   │   ├── middleware/     # Auth and validation middleware
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Helpers (system config)
│   │   └── server.ts       # Express app entry point
│   ├── uploads/            # Uploaded documents (not committed)
│   ├── .env.example        # Example environment settings
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── context/        # React contexts (Auth)
│   │   ├── layouts/        # Page layouts
│   │   ├── pages/          # Page components
│   │   │   ├── auth/       # Login, Register
│   │   │   ├── student/    # Student pages
│   │   │   ├── lecturer/   # Lecturer pages
│   │   │   ├── coordinator/# Coordinator pages
│   │   │   ├── admin/      # Admin pages
│   │   │   └── shared/     # Shared pages
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx         # Main app component
│   │   ├── main.tsx        # Entry point
│   │   └── theme.ts        # MUI theme config
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

## 📊 Database Schema

The system uses the following main tables:
- `users` - All system users
- `projects` - Student project proposals
- `submissions` - Document submissions
- `grades` - Submission grades
- `messages` - Direct messages
- `notifications` - System notifications
- `academic_year_config` - Academic year settings
- `lecturer_capacity` - Supervisor capacity tracking
- `presentation_schedules` - Presentation scheduling
- `audit_logs` - System audit trail

## 🔒 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project (students)
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/review` - Review project (lecturers)

### Submissions
- `GET /api/submissions/project/:projectId` - Get project submissions
- `POST /api/submissions/:id/upload` - Upload document
- `POST /api/submissions/:id/grade` - Grade submission

### Messages & Notifications
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/read-all` - Mark all as read

### Coordinator
- `GET /api/coordinator/dashboard` - Dashboard stats
- `POST /api/coordinator/academic-years` - Configure academic year
- `GET /api/coordinator/users` - List users
- `POST /api/coordinator/presentations` - Schedule presentations

## 🎨 UI Features

- Dark theme with glass morphism design
- Responsive layout for mobile and desktop
- Real-time notifications
- Interactive charts and analytics
- Drag-and-drop file upload
- Form validation with helpful error messages

## 🎓 About

This was my final year project for the BSc in Computer Science at the University of Botswana (2026).

## 📝 License

This project is for educational purposes.

## 👩‍💻 Author

Jesutofunmi Ogundare
