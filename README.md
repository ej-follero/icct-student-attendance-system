# ICCT Smart Attendance System

A modern web application for smart attendance management for ICCT Colleges, built with Next.js, React, Prisma, Tailwind CSS, and more.

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### 1. **Clone the Repository**
```sh
git clone <repo-url>
cd icct-smart-attendance-system
```

### 2. **Install Node.js**
- Make sure you have **Node.js** (v18 or later) and **npm** installed.
- [Download Node.js here](https://nodejs.org/)

### 3. **Install Dependencies**
```sh
npm install
```

### 4. **Set Up Environment Variables**
- Copy the example environment file or create a `.env` file in the root directory.
- Fill in the required environment variables

Example:
```sh
cp .env.example .env
# Then edit .env as needed
```

### 5. **Set Up the Database**
- Run Prisma migrations to set up your database schema:
```sh
npx prisma migrate dev
```
- (Optional) Seed the database if a seed script is provided:
```sh
npx prisma db seed
```

### 6. **Run the Development Server**
```sh
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. **Build for Production (Optional)**
```sh
npm run build
npm start
```

### 8. **Performance Optimization (Recommended)**
```sh
# Run the performance setup script
npm run setup:performance

# Test performance after optimizations
npm run test:performance
```

## ⚡ Performance Optimizations

This application has been optimized for high performance with the following improvements:

- **Database Connection Pooling**: Optimized Prisma client with connection pooling
- **Parallel Query Execution**: Database queries run in parallel instead of sequentially
- **Fast Health Checks**: New `/api/ping` endpoint for sub-millisecond response times
- **Comprehensive Monitoring**: `/api/health` endpoint with database connectivity testing
- **Optimized Docker Configuration**: PostgreSQL tuned for better performance
- **Next.js Optimizations**: Compression, minification, and package optimization

### Expected Performance Improvements:
- **Ping endpoint**: < 10ms (was 3000ms+)
- **Health check**: < 100ms (was 3000ms+)
- **Database test**: < 500ms (was 3000ms+)
- **Overall improvement**: 60-80% faster response times

For detailed performance optimization information, see [docs/PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md).

---

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Radix UI, Lucide React, Framer Motion, Recharts
- **Backend:** Prisma, bcrypt, Zod, date-fns
- **Database:** (Configure in `.env`)
- **Other:** XLSX, jsPDF, React Hook Form, and more

---

## 📄 License

This project is for educational purposes.

## Screenshots
<img width="1888" height="987" alt="image" src="https://github.com/user-attachments/assets/6a38840e-1000-44df-b91c-7be3024ae42c" />
<img width="1910" height="1033" alt="image" src="https://github.com/user-attachments/assets/176a77ab-b5a2-457a-928a-d9e192d73fc6" />

