

  ## 🚀 Getting Started

1. **Install Dependencies**: `npm run install:all`
2. **Start Database**: Make sure PostgreSQL is running on port 5432.
3. **Initialize Database**:
   ```bash
   cd packages/database
   npx prisma db push
   npx prisma db seed
   ```
4. **Run Platform**: `npm run dev:all` (from the root)

## 🔑 Default Credentials
See [CREDENTIALS.md](./CREDENTIALS.md) for a full list of test accounts.
Default password: `123456`