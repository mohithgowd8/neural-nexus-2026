# NEURAL NEXUS 2026 | Real-Time Online Quiz Platform

> **"THINK. DECODE. INNOVATE."**  
> Organized by the **Department of Artificial Intelligence & Data Science**  

## 🌐 Live Website Links

- 🚀 **Live GitHub Pages URL (Click to Open)**:  
  ### 👉 [https://mohithgowd8.github.io/neural-nexus-2026/](https://mohithgowd8.github.io/neural-nexus-2026/)
- 💻 **GitHub Repository**: [https://github.com/mohithgowd8/neural-nexus-2026](https://github.com/mohithgowd8/neural-nexus-2026)

---

## 🌟 Key Features

### 🎓 Participant Experience (`/` & `/join`)
- **Single Public Join Link (`/join`)**: Mobile-first and desktop-responsive interface for all participants.
- **Unique Team Code System**: Every team receives an automatically generated unique Team Code (`NN26-XXXX`). Code and session state persist across browser reloads.
- **Clean Registration**: Starts completely empty with zero dummy data (Team Name, Leader Name & Roll Number, Member 2 Name & Roll Number, optional Members 3 & 4).
- **Waiting Room (`/waiting`)**: Synchronizes with the Admin Control Deck in real time via WebSockets. Automatically launches when the organizer starts the quiz.
- **One Question at a Time (`/quiz`)**:
  - Independent, per-team randomized sequence from the 100-question pool (Fisher-Yates shuffle).
  - Strict 2-minute server-authoritative timer (`02:00`) for every question.
  - Automatic advance and answer lock upon timer expiration.
  - Zero answer leaks: correct answers remain strictly server-side.
  - **NO Skip button, NO Previous button, NO question overview jumping.**
- **Fast Answer Scoring**: Points awarded based on both correctness and speed:
  - 0–20s: 10 points
  - 21–40s: 9 points
  - 41–60s: 8 points
  - 61–80s: 7 points
  - 81–100s: 6 points
  - 101–120s: 5 points
  - Wrong or Unanswered: 0 points
- **Quiz Completion Screen**: Displays Team Name, Total Score, Correct Answers count, Accuracy %, and Average Answer Speed.
- **Public Standings (`/leaderboard`)**: Real-time ranked leaderboard revealed upon event completion or when enabled by the organizer.

### 🛡️ Organizer Admin Hub (`/admin`)
- **Live Monitor & Controls**: Real-time counter of joined teams, active devices, completed submissions, and average scores.
- **Event Lifecycle Controls**: One-click buttons to `START QUIZ (GO LIVE)`, `PAUSE`, `END QUIZ`, or `RESET EVENT`.
- **Question Bank (100 Questions)**:
  - Full CRUD: Add, edit, delete, and enable/disable individual questions.
  - One-click **Load 100 AI/DS Questions**: Instantly loads the curated 100 Basic AI Tools competition questions.
  - Bulk JSON upload and question purging.
- **Registered Teams**: Inspect team members, roll numbers, individual progress, and verify device connections.
- **Quiz Settings**: Configure question duration (120s), total questions (100), max points (10), and speed scoring toggle.
- **Export Results**: Download complete competition standings and answers as CSV.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Socket.io (WebSocket), Bcrypt, JWT |
| **Database** | SQLite via `sql.js` (WebAssembly - pure JS, zero-config, runs cross-platform) |
| **Security** | Server-authoritative timer & scoring, answer keys never sent to browser |

---

## ⚡ Quick Start

### 1. Installation
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Run Locally
```bash
# Start backend server (Port 5000)
cd server
npm run dev

# Start frontend dev server (Port 5173)
cd ../client
npm run dev
```

### 3. Build for Production
```bash
# Build client
cd client
npm run build

# Start production server
cd ../server
npm start
```
The server on port 5000 automatically serves both the API endpoints and the compiled frontend single-page application.

---

## 🌐 Default Credentials

- **Admin Login**: [http://localhost:5173/admin](http://localhost:5173/admin)
- **Username**: `admin`
- **Password**: `admin@nexus2026`

---

## 📄 License
MIT &bull; Department of Artificial Intelligence & Data Science &bull; 2026
