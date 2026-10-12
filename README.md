# Digital Wellbeing Focus Tracker

A full-stack web application that helps students track their study sessions, manage focus time, monitor burnout risk, and access study materials with video lectures and notes.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js (REST API)
- **Database**: SQLite (via better-sqlite3)

## Features

- Focus timer with Pomodoro mode and custom durations
- Ambient background sounds (rain, forest, waves) via Web Audio API
- Manual session logging with subject, duration, type, and notes
- Dashboard with today's stats, streak counter, and motivational quotes
- Burnout risk indicator with factor breakdown
- Daily and weekly statistics with bar charts
- 5 pre-configured study subjects with embedded video lectures and notes
- Dark/light theme toggle
- CSV export of session history
- Keyboard shortcuts (Space to start/pause timer, Esc to close modals)

## Setup

1. Make sure [Node.js](https://nodejs.org/) (v18+) is installed
2. Open a terminal in the project folder
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
   Or use watch mode for development:
   ```
   npm run dev
   ```
5. Open your browser to **http://localhost:3000**

The SQLite database (`backend/data/wellbeing.db`) is created automatically on first run with the schema and pre-seeded subjects/videos.

## API Endpoints

| Method | Endpoint                    | Description                |
|--------|-----------------------------|----------------------------|
| GET    | /api/sessions               | List all sessions          |
| POST   | /api/sessions               | Create a session           |
| PUT    | /api/sessions/:id           | Update a session           |
| DELETE | /api/sessions/:id           | Delete a session           |
| GET    | /api/dashboard              | Dashboard summary          |
| GET    | /api/statistics/daily       | Today's stats              |
| GET    | /api/statistics/weekly      | This week's stats          |
| GET    | /api/burnout-risk           | Burnout risk calculation   |
| GET    | /api/subjects               | List all subjects          |
| GET    | /api/subjects/:id           | Get one subject            |
| GET    | /api/subjects/:id/notes     | List notes for a subject   |
| POST   | /api/subjects/:id/notes     | Add a note                 |
| PUT    | /api/notes/:id              | Update a note              |
| DELETE | /api/notes/:id              | Delete a note              |
| GET    | /api/subjects/:id/videos    | List videos for a subject  |
| POST   | /api/subjects/:id/videos    | Add a video                |
| PUT    | /api/videos/:id/toggle      | Toggle video watched       |
| DELETE | /api/videos/:id             | Delete a video             |

## Folder Structure

```
Digital-Wellbeing-Focus-Tracker/
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   ├── js/script.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── sessions.js
│   │   └── subjects.js
│   ├── controllers/
│   │   ├── sessionController.js
│   │   └── subjectController.js
│   ├── database/
│   │   ├── database.js
│   │   └── schema.sql
│   └── data/
│       └── wellbeing.db (auto-created)
├── package.json
├── README.md
└── .gitignore
```
