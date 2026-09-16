<div align="center">
  <img src="app/public/favicon.svg" alt="AlgoForge Logo" width="120" />
</div>

<h1 align="center">AlgoForge</h1>

<div align="center">
  <strong>Master Data Structures and Algorithms with a gamified, structured, and modern learning platform.</strong>
</div>
<br />

> [!NOTE]
> Interested in contributing to AlgoForge? Please read our [Contributing Guide](CONTRIBUTING.md) to set up your local development environment and learn about our workflow.

AlgoForge is designed to help developers build algorithmic intuition through consistent practice. Inspired by top-tier learning platforms, it combines a highly structured roadmap with engaging gamification elements—such as streaks, XP systems, and global leaderboards—to make learning addictive and rewarding.

## Key Features

- **Gamified Learning Experience**  
  Earn XP for every problem you solve to level up your profile. Maintain daily activity streaks to build discipline, and unlock exclusive badges for reaching key milestones.
- **Structured Roadmaps**  
  Follow curated paths covering essential DSA topics (Arrays, Trees, Graphs, Dynamic Programming). Each module includes conceptual videos, practice problems, and progress tracking.
- **Dynamic Leaderboard**  
  See where you stand globally in real-time. Filter rankings by XP, current streak, or total problems solved to compete with fellow learners.
- **Personalized Dashboard**  
  Visualize your weekly coding intensity with activity graphs. Use the "Resume Learning" feature for one-click access to your last studied topic, and get a quick overview of your global rank and stats.
- **Secure Authentication**  
  Secure and seamless access using Email/Password login or Google OAuth 2.0 for one-click authentication.

## Tech Stack

The platform is built using a modern, scalable stack:

**Frontend**
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling & UI:** Tailwind CSS, Radix UI, Lucide React
- **Animations:** Framer Motion, GSAP
- **State/Query:** React Query, React Hook Form

**Backend**
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Prisma)
- **Auth:** JWT (JSON Web Tokens) & Google OAuth 2.0

## Getting Started

> [!IMPORTANT]
> Ensure you have **Node.js (v18+)** installed and access to a **MongoDB** instance (local or Atlas) before proceeding.

### 1. Clone the repository

```bash
git clone https://github.com/rishabhx29/AlgoForge.git
cd AlgoForge
```

### 2. Setup the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
CLIENT_URL=http://localhost:5173
```

> [!NOTE]
> Make sure your `MONGO_URI` points to a running MongoDB instance and your `GOOGLE_CLIENT_ID` is correctly configured in your Google Cloud Console to allow the `CLIENT_URL` as an authorized origin.

Start the backend server:

```bash
npm run dev
```

### 3. Setup the Frontend

Open a new terminal session, navigate to the `app` directory, and install the dependencies:

```bash
cd app
npm install
```

Create a `.env` file in the `app` directory:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the frontend development server:

```bash
npm run dev
```

### 4. Run the Application

Open your browser and navigate to [http://localhost:5173](http://localhost:5173) to view the application.

> [!TIP]
> Use the mock data or register a new account to test the XP and Streak systems locally.
```
