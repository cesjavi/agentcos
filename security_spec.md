# Security Specification for AgenticOS

## Data Invariants
1. A **Project** must always have an `ownerId` matching the creator's UID.
2. An **Agent** must belong to a valid `projectId` where the user is the owner.
3. A **Task** must belong to a valid `projectId`.
4. **ExecutionLogs** are append-only; users cannot delete logs.
5. **PromptVersions** are immutable; once created, they cannot be modified.
6. **Memories** are private to a project.

## The Dirty Dozen Payloads (Targeted for Rejection)

1. **Identity Spoofing**: Creating a project with someone else's UID as `ownerId`.
2. **Project Injection**: Creating an agent in a project you don't own.
3. **Ghost Field**: Adding `isVerified: true` to a user profile or project.
4. **Self-Rating**: Approving your own agent execution if that role was meant for another (not applicable here as user is the boss, but we keep it tight).
5. **Orphaned Task**: Creating a task with a non-existent `projectId`.
6. **Prompt Mutation**: Attempting to update a `PromptVersion` content after creation.
7. **Cross-Project Memory Read**: Querying memories belonging to another user's project.
8. **Malicious ID**: Creating a project with a 2KB string as ID to cause resource exhaustion.
9. **Log Deletion**: Attempting to delete execution status logs.
10. **Feedback Injection**: Adding feedback for an execution that doesn't exist.
11. **Token Usage Forging**: Manual update of `cost` or `tokenUsage` in an execution record.
12. **Future Timestamp**: Setting `createdAt` to a point in the future.

## Test Runner Plan
I will implement `firestore.rules` and verify them using the logic described in the instructions.
