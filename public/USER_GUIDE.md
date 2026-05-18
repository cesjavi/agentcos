# AgentiCos: The Definitive User Guide

Welcome to **AgentiCos**, a high-performance orchestration layer for autonomous AI agent networks. This guide provides deep-dive instructions on managing your cognitive infrastructure, from semantic memory banks to visual workflow orchestration.

---

## 1. Project Management & The Neural Hub
Projects are the foundational environments where your agents collaborate.

### The Project Dashboard
- **Strategic Objectives**: Every project should have a clearly defined "Baseline Instruction" which acts as the global system prompt for all agents within that cluster.
- **View Modes**:
    - **List View (Standard)**: Best for managing tasks and reviewing execution history.
    - **Visual Workflow (New)**: A dynamic, real-time representation of your agent chain. It visualizes the connection between the **Neural Cache**, the **Planner**, the **Executor**, and the **Final Reviewer**.
- **Neural Cache Overview**: Located in the project detail page, this section displays the most recent 4 fragments of knowledge retrieved from the Memory Bank that are specific to this project.

---

## 2. Agent Dynamics & Roles
Agents are not just LLM wrappers; they are specialized workers with state and memory.

### The Specialist Chain
1. **Planner**: Analyzes the user task, retrieves relevant memories from the Neural Cache, and breaks down the goal into a non-linear execution plan.
2. **Executor**: The primary worker. It processes the plan and produces the initial "draft" of the work.
3. **Reviewer**: Performs quality control. It compares the draft against the original goal and the project's behavioral preferences to produce the final "Polished Result".

### Lifecycle & Status
- **Online**: The agent is currently active in a sequence.
- **Error**: The agent encountered a logical or API failure (status resets on the next successful run).
- **Offline**: The agent is idling in the cluster.

---

## 3. The Execution Console
The "cockpit" of AgentiCos where you witness the cognitive process in real-time.

### Real-Time Monitoring
- **Chain Activity**: Watch as the system moves through Memory Retrieval, Planning, Execution, and Review.
- **Prompt Versions**: You can track exactly which version of a prompt was used for a specific response, allowing for precise debugging in the Prompt Lab.

### The Learning Loop (Critical)
After an execution completes, you MUST provide feedback to strengthen the Neural Cache:
- **Efficiency Rating (1-5 Stars)**: Ratings of **4 stars or higher** automatically trigger a "Success Pattern" memory for the project.
- **Performance Notes**: Descriptive text about what went well or what was missing.
- **Suggested Corrections**: If you paste specific corrections, the system creates an **Error Correction** memory. This ensures the agents never repeat the same mistake twice.

---

## 4. Memory Bank: The Long-Term Brain
The Memory Bank (or Neural Store) is a persistent vector-like storage for cross-session context.

### Neural Injection (Manual Entry)
You can now manually "inject" knowledge fragments into the system:
- **Preference**: General user likes/dislikes (e.g., "Always use metric units").
- **Error Fix**: Specific instructions on how to handle a common edge case.
- **Success Pattern**: High-level templates of successful outputs.
- **Business Rule**: Immutable constraints (e.g., "Maximum character count for social posts is 280").

### Eviction & Management
- **Semantic Search**: Type natural language queries into the Memory Bank search bar. The system uses AI to find semantically relevant fragments, even if keywords don't match exactly.
- **Memory Eviction**: Use the "Trash" icon to remove outdated or incorrect memories (Evict Memory).

---

## 5. Advanced Workflows
### From Feedback to Memory
When you submit a feedback form with a correction, AgentiCos:
1. Validates the correction.
2. Identifies the associated project.
3. Generates a new "Neural Fragment".
4. Tags it as `automated` and `from-feedback`.
5. Includes it in the context of the next execution via the **Memory Retrieval** phase.

### Visual Workflow Orchestration
Use the **Armador Visual** (Layout View) to:
- Monitor which agents are currently "Online".
- Quickly jump to specific agent instructions by clicking their nodes.
- Verify the connection to the Neural Cache.

---

## 7. Practical Use Case: Marketing Intelligence
To get the most out of AgentiCos, follow this end-to-end example of an automated research workflow:

### Step 1: Strategic Setup
1. **Create a Project** named "Market Research - Q3".
2. **Define Baseline Instruction**: "Analyze competitors focusing on B2B SaaS solutions, maintaining a professional and data-driven tone."

### Step 2: Knowledge Seeding
Go to the **Memory Bank** and inject two crucial fragments:
- **Preference**: "Always use bullet points for comparisons."
- **Business Rule**: "Exclude competitors with less than $1M in estimated annual revenue."

### Step 3: Execution
Navigate to the **Execution Console** and request:
> "Research the top 5 emerging AI productivity tools for developers and identify their core value propositions."

### Step 4: The Outcome & Learning
- The **Planner** will retrieve your revenue rules and style preferences.
- The **Executor** will draft the research.
- The **Reviewer** will ensure it only contains 5 tools and follows the bullet-point format.
- **Critical Action**: Rate the finished task **5 Stars**. AgentiCos will automatically save this format as a **Success Pattern** for all future research tasks.

---

## 8. Pro-Tips for Peak Performance
- **Atomic Memories**: Keep injected memories short and focused (one rule per memory).
- **Tag Everything**: Use consistent tags like `security`, `style`, or `database` to make manual memory management easier.
- **The 4-Star Rule**: Aim to rate successful executions frequently. This builds a robust "Success Pattern" library that makes the Planner agent significantly more efficient over time.

---
*AgentiCos v1.4 - Orchestrating the Future of Autonomous Cognition.*
