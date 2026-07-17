# Math Teacher Smart Platform (منصة معلم الرياضيات)

## Overview
**Math Teacher Smart Platform** is a state-of-the-art educational ecosystem designed specifically for mathematics education. It leverages artificial intelligence and adaptive learning technologies to provide a personalized experience for students, while offering powerful management and analytics tools for teachers, parents, and administrators.

The platform is designed with a **Right-to-Left (RTL)** interface, primarily catering to Arabic-speaking users with a premium, modern design.

## Key Roles & Dashboards

### 👨‍🎓 Student (Online & Center)
- **Online Student**: Remote access to video courses, homework, and exams. Features an AI chatbot for instant support.
- **Center Student**: Management for in-person learning, tracking attendance, and center-specific resources.
- **Core Features**:
  - **Video Learning**: High-quality video player with course tracking.
  - **Exams & Homework**: Interactive testing environment with instant results.
  - **AI Math Solver**: Tool to help students understand complex mathematical problems.
  - **Adaptive Learning**: Personalized learning paths based on performance.

### 👨‍🏫 Teacher
- **Course Management**: Create and organize mathematical content.
- **Student Tracking**: Monitor individual and group progress.
- **AI Tools**: Assistance in creating exams and analyzing student performance.
- **Analytics**: Deep insights into student strengths and weaknesses.

### 👪 Parent
- **Progress Monitoring**: Real-time updates on student performance and attendance.
- **Communication**: Direct messaging with teachers.
- **Reports**: Detailed periodic reports on learning outcomes.

### ⚙️ Admin
- **System Management**: Manage users, roles, and platform settings.
- **Financial Tracking**: (If applicable) monitoring subscriptions and plans.
- **Global Analytics**: Overview of platform-wide activity.

## Technology Stack
- **Framework**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**:
  - [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
  - [Radix UI](https://www.radix-ui.com/) for accessible, unstyled components.
  - [Material UI (MUI)](https://mui.com/) for rich interactive elements.
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/) & [MUI Icons](https://mui.com/material-ui/material-icons/)
- **Charts**: [Recharts](https://recharts.org/)

## Project Structure
```text
src/
├── app/
│   ├── components/       # UI Components organized by role
│   │   ├── admin/        # Administrator components
│   │   ├── ai/           # AI features (Math Solver, Adaptive Learning)
│   │   ├── auth/         # Login and Password recovery
│   │   ├── landing/      # Main public landing page
│   │   ├── parent/       # Parent dashboard
│   │   ├── student-*/    # Student dashboards
│   │   ├── teacher/      # Teacher dashboard
│   │   └── ui/           # Shared UI components (Shadcn-like)
│   ├── contexts/         # React Contexts (Auth, Theme)
│   └── App.tsx           # Main routing and application entry
├── styles/               # Global styles and Tailwind configuration
└── main.tsx              # React mounting point
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Login for Development
The platform uses mock authentication for development purposes. You can use the following credentials:
- **Admin**: `admin@edu.com`
- **Teacher**: `teacher@edu.com`
- **Online Student**: `student@edu.com`
- **Parent**: `parent@edu.com`

## Core Features Breakdown

### 🤖 AI Integration
- **AI Math Solver**: Step-by-step solutions for complex math equations.
- **Adaptive Learning Engine**: Dynamically adjusts content difficulty based on student performance.

### 📊 Real-time Analytics
- Interactive charts showing progress over time.
- Subject-specific breakdown of performance.

### 🎨 Design Philosophy
- **Modern & Premium**: Glassmorphism effects, smooth transitions, and a clean typography.
- **RTL Support**: Full support for Arabic language and Right-to-Left layout.
- **Responsive**: Fully optimized for Desktop, Tablet, and Mobile devices.
