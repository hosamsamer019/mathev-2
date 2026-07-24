# 🚀 Enterprise Deployment Guide: Math Teacher Smart Platform

To deploy this enterprise-grade platform, we use a **Decoupled Deployment Strategy**.

## 1. 🌐 Frontend (Netlify)
The frontend is already configured for Netlify via `netlify.toml`.

**Steps:**
1. Connect your GitHub repository to Netlify.
2. Select the `apps/frontend` directory as the base.
3. Set the following Environment Variables in Netlify Settings:
   - `VITE_AUTH_API_URL`
   - `VITE_USER_API_URL`
   - `VITE_AI_API_URL`
   - `VITE_COURSE_API_URL`
   - `VITE_ANALYTICS_API_URL`
4. Netlify will automatically build and deploy your React app.

## 2. ⚙️ Backend Microservices (Render / Railway)
Microservices require a Node.js runtime. I recommend **Render** or **Railway**.

**For each service (Auth, User, AI, Course, Analytics):**
1. Create a new "Web Service" on Render.
2. Point it to the specific service directory (e.g., `services/auth-service`).
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. **Critical Env Vars:**
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A secure random string.
   - `OPENAI_API_KEY`: (For AI Service).

## 3. 🗄️ Database (Supabase / RDS)
1. Use **Supabase** or **Neon.tech** for a managed PostgreSQL database.
2. Update the `DATABASE_URL` in all microservices.
3. Run `npx prisma db push` from `packages/database` to initialize the production schema.

## 📦 Docker Support
I have included `docker-compose.yml` for containerized deployment. 
You can deploy the entire stack to a **DigitalOcean Droplet** or **AWS EC2** using:
```bash
docker-compose up --build -d
```
