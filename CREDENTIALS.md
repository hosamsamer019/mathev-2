# 🔑 Platform Access Credentials (Development Only)

> [!WARNING]
> This file is for **development and testing purposes only**. Never include this file in a production environment or commit it to a public repository if it contains real sensitive data.

## 🧪 Recommended Test Accounts
Since the system now uses a real database, you need to register these or use a seeder. By convention, we use these for testing:

| Role | Email | Password (Default) |
| :--- | :--- | :--- |
| **Admin** | `admin@edu.com` | `123456` |
| **Teacher** | `teacher@edu.com` | `123456` |
| **Student (Online)** | `student@edu.com` | `123456` |
| **Parent** | `parent@edu.com` | `123456` |

---

## 🏛️ Legacy Mock Credentials (Reference)
If you are still running a version with mock data, these were the previous defaults:

- **All Roles Password**: `123456`
- **Emails**: 
  - `student@edu.com` (Student)
  - `center@edu.com` (Center Student)
  - `teacher@edu.com` (Teacher)
  - `admin@edu.com` (Admin)

---

## 🛠️ Infrastructure Passwords
These are the credentials configured in your `docker-compose.yml` and `.env` files:

- **PostgreSQL User**: `postgres`
- **PostgreSQL Password**: `password`
- **PostgreSQL Database**: `math_platform`
- **Redis**: No password (default local config)

---

## 🛡️ Security Note
All user passwords in the new system are encrypted using **Bcrypt (10 salt rounds)**. The "real" passwords stored in the database are unreadable strings like `$2a$10$...`.
