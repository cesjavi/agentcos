# AgentiCos: Multi-Agent AI Platform

AgentiCos is a high-performance multi-agent AI orchestration platform designed to transform complex conceptual goals into autonomous, high-quality outputs. Unlike simple chat interfaces, AgentiCos utilizes a specialized "Neural Bridge" architecture where diverse agents—Planners, Executors, Reviewers, and Optimizers—collaborate in real-time.

The platform's core strength lies in its **Semantic Memory Bank**, which captures every success pattern and user correction to build a persistent cognitive foundation that improves with every interaction. With features like self-correcting feedback loops, automated quality assurance, and deep integration with external tools via Webhooks, AgentiCos acts as a "cockpit" for cognitive infrastructure. It provides developers and researchers with professional-grade tools for managing prompt versioning, monitoring real-time agent chains, and deploying autonomous workflows that learn, adapt, and scale across any industry from marketing intelligence to core software engineering.

## Core Features

- **Multi-Agent Collaboration**: Orchestrate Planner, Executor, and Reviewer agents to solve complex tasks.
- **Feedback Loops**: Human-in-the-loop feedback (ratings, comments, corrections) that directly impacts agent memory and prompt optimization.
- **Prompt Lab**: Version control for prompts with performance tracking and one-click reverts.
- **Persistent Memory**: A centralized knowledge bank that stores preferences, successful patterns, and error corrections.
- **Real-time Console**: Live execution logs with step-by-step transparency.
- **Dashboard**: Advanced metrics for project health, agent performance, and cost tracking.

## Getting Started

### 1. Initial Setup
The application is pre-configured with Firebase and the Gemini API. 
Go to the **Settings** page and click **"Seeding Agentic Core"** to populate your workspace with demo data (Project, Agents, and Task).

### 2. Running a Task
1. Navigate to **Projects**.
2. Select the "Content Production System" project.
3. Click the **Play** icon next to the "Announce AgentiCos Launch" task.
4. Click **"Start Sequence"** in the execution console.
5. Watch the Planner, Executor, and Reviewer agents collaborate in real-time.

### 3. Giving Feedback
Once the execution is complete, use the feedback panel to rate the result. This information is stored and used by the "Optimizer" and "Memory" agents for future tasks.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS v4, Motion, Recharts.
- **Backend**: Express (Vite Middleware).
- **Database**: Firebase Firestore.
- **Auth**: Firebase Google Auth.
- **AI**: Google Gemini Pro (via @google/genai SDK).

## Security
Firestore security rules are deployed to ensure users can only access their own projects and data.
