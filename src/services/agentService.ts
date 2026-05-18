import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { Feedback, Memory } from "../types";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

export const agentService = {
  async createExecution(taskId: string) {
    try {
      const docRef = await addDoc(collection(db, "executions"), {
        taskId,
        status: "starting",
        result: "",
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        cost: 0,
        startedAt: serverTimestamp(),
      });
      
      await updateDoc(doc(db, "tasks", taskId), {
        currentExecutionId: docRef.id,
        status: "running"
      });
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "executions");
      throw error;
    }
  },

  async addLog(executionId: string, agentId: string, step: string, content: string, type: 'info' | 'result' | 'error' | 'prompt' = 'info', promptVersionId?: string) {
    try {
      await addDoc(collection(db, "executionLogs"), {
        executionId,
        agentId,
        promptVersionId: promptVersionId || null,
        step,
        content,
        type,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "executionLogs");
    }
  },

  async updateExecutionStatus(executionId: string, status: string, result: string = "") {
    try {
      const updateData: any = { status };
      if (result) {
        updateData.result = result;
        updateData.finishedAt = serverTimestamp();
      }
      await updateDoc(doc(db, "executions", executionId), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `executions/${executionId}`);
    }
  },

  async updateAgentStatus(agentId: string, status: string) {
    try {
      await updateDoc(doc(db, "agents", agentId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agents/${agentId}`);
    }
  },

  async saveFeedback(executionId: string, feedback: Partial<Feedback>) {
    try {
      await addDoc(collection(db, "feedback"), {
        executionId,
        ...feedback,
        createdAt: serverTimestamp(),
      });

      // Fetch execution and task to get projectId for potential memory
      const executionSnap = await getDocs(query(collection(db, "executions"), where("__name__", "==", executionId)));
      const executionData = executionSnap.docs[0]?.data();
      const taskId = executionData?.taskId;
      
      let projectId = "";
      if (taskId) {
        const taskSnap = await getDocs(query(collection(db, "tasks"), where("__name__", "==", taskId)));
        projectId = taskSnap.docs[0]?.data()?.projectId || "";
      }

      // If rating is high or corrections exist, generate a memory
      if (projectId && (feedback.rating && feedback.rating >= 4 || feedback.corrections)) {
        const memoryContent = feedback.corrections 
          ? `Correction: ${feedback.corrections}`
          : feedback.comment 
            ? `Observation: ${feedback.comment}`
            : `Successful pattern in task execution.`;
            
        await this.addMemory(projectId, {
          content: memoryContent,
          type: feedback.corrections ? "error_fix" : "success_pattern",
          tags: ["automated", "from-feedback"]
        });
      }

      // Simple implementation: update scores of used prompt versions
      if (feedback.rating) {
        const score = (feedback.rating / 5) * 100;
        const logsRef = collection(db, "executionLogs");
        const q = query(logsRef, where("executionId", "==", executionId));
        const logSnap = await getDocs(q);
        
        const uniqueVersionIds = new Set<string>();
        logSnap.forEach(doc => {
          const data = doc.data();
          if (data.promptVersionId) uniqueVersionIds.add(data.promptVersionId);
        });

        for (const vId of uniqueVersionIds) {
          // Simple average logic would be better, but for now we just bump it
          // In a real app, you'd store count and totalScore
          await updateDoc(doc(db, "promptVersions", vId), {
            performanceScore: score 
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "feedback");
    }
  },

  async saveAgentFeedback(agentId: string, userId: string, feedback: Partial<Feedback>) {
    try {
      await addDoc(collection(db, "feedback"), {
        agentId,
        userId,
        ...feedback,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "feedback");
      throw error;
    }
  },

  async createAgent(agentData: any) {
    try {
      const agentRef = await addDoc(collection(db, "agents"), {
        ...agentData,
        status: "online",
        createdAt: serverTimestamp(),
      });

      // Create v1 prompt version
      const versionRef = await addDoc(collection(db, "promptVersions"), {
        agentId: agentRef.id,
        content: agentData.instructions,
        changes: "Initial deployment",
        versionNumber: 1,
        performanceScore: 0,
        createdAt: serverTimestamp(),
      });

      // Link active version
      await updateDoc(doc(db, "agents", agentRef.id), {
        activePromptVersionId: versionRef.id
      });

      return agentRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "agents");
      throw error;
    }
  },

  async createPromptVersion(agentId: string, content: string, changes: string, versionNumber: number) {
    try {
      const docRef = await addDoc(collection(db, "promptVersions"), {
        agentId,
        content,
        changes,
        versionNumber,
        performanceScore: 0,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "agents", agentId), {
        instructions: content,
        activePromptVersionId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "promptVersions");
      throw error;
    }
  },

  async revertToVersion(agentId: string, version: any) {
    try {
      await updateDoc(doc(db, "agents", agentId), {
        instructions: version.content,
        activePromptVersionId: version.id
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agents/${agentId}`);
      throw error;
    }
  },

  async deleteProject(projectId: string) {
    try {
      await deleteDoc(doc(db, "projects", projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
      throw error;
    }
  },

  async createProject(projectData: any) {
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        ...projectData,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "projects");
      throw error;
    }
  },

  async deleteAgent(agentId: string) {
    console.log("--- agentService.deleteAgent START --- for:", agentId);
    try {
      const agentRef = doc(db, "agents", agentId);
      console.log("Document reference path:", agentRef.path);
      
      if (!auth.currentUser) {
        console.warn("No authenticated user found during deletion attempt");
      } else {
        console.log("Current user UID:", auth.currentUser.uid);
      }

      await deleteDoc(agentRef);
      console.log("--- agentService.deleteAgent SUCCESS ---");
    } catch (error) {
      console.error("--- agentService.deleteAgent FAILURE ---", error);
      handleFirestoreError(error, OperationType.DELETE, `agents/${agentId}`);
      throw error;
    }
  },

  async updateAgent(agentId: string, updates: any) {
    try {
      const agentRef = doc(db, "agents", agentId);
      
      // If instructions are changing, we should probably create a new prompt version
      // But for a simple configuration edit, we can just update the agent doc first.
      // The user can manage versions in the detail page if we have that logic.
      
      await updateDoc(agentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agents/${agentId}`);
      throw error;
    }
  },

  async deleteTask(taskId: string) {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
      throw error;
    }
  },

  async synthesizeSearch(query: string, results: Memory[]) {
    try {
      if (results.length === 0) return null;
      
      const context = results.slice(0, 5).map(m => `[Type: ${m.type}] Content: ${m.content}`).join("\n---\n");
      const systemInstruction = `You are the Central Cognitive Processor of AgentiCos. 
      The user is searching for knowledge in their "Memory Bank".
      Based on the retrieved memory fragments below, provide a concise synthesis or "Neural Answer".
      If the memories contain a rule, explain how it applies. If they contain code, summarize the pattern.
      Be extremely professional, technical, and brief. Use Markdown.`;
      
      const prompt = `QUERY: ${query}\n\nRETRIEVED CONTEXT:\n${context}`;
      
      const response = await this.callModel(prompt, systemInstruction);
      return response.text;
    } catch (error) {
      console.error("Synthesis failed", error);
      return null;
    }
  },

  async addMemory(projectId: string, memoryData: Partial<Memory>) {
    try {
      if (!memoryData.content) return;
      
      // Limit content length to prevent token bloat
      const cleanedContent = memoryData.content.substring(0, 5000);
      
      // Check for duplicates to prevent "Recursive Garbage"
      const q = query(
        collection(db, "memories"), 
        where("projectId", "==", projectId),
        where("content", "==", cleanedContent)
      );
      
      const existing = await getDocs(q);
      if (!existing.empty) {
        const existingDoc = existing.docs[0];
        await updateDoc(doc(db, "memories", existingDoc.id), {
          useCount: (existingDoc.data().useCount || 0) + 1,
          lastUsedAt: serverTimestamp()
        });
        return existingDoc.id;
      }

      const docRef = await addDoc(collection(db, "memories"), {
        projectId,
        ownerId: auth.currentUser?.uid,
        ...memoryData,
        content: cleanedContent,
        useCount: 1,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "memories");
    }
  },

  async deleteMemory(memoryId: string) {
    try {
      await deleteDoc(doc(db, "memories", memoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "memories");
      throw error;
    }
  },

  async updateMemory(memoryId: string, updates: Partial<Memory>) {
    try {
      await updateDoc(doc(db, "memories", memoryId), {
        ...updates,
        lastUsedAt: serverTimestamp() // Auto-update last used on any modification
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `memories/${memoryId}`);
      throw error;
    }
  },

  async findMemory(projectId: string, queryStr: string) {
    try {
      const q = query(
        collection(db, "memories"), 
        where("projectId", "==", projectId)
      );
      const snap = await getDocs(q);
      const memories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (!queryStr.trim()) return memories;
      
      return this.semanticSearchMemories(queryStr, memories);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "memories");
      return [];
    }
  },

  async analyzeProjectContext(context: string, repoUrl?: string) {
    try {
      const systemInstruction = `You are a Senior Systems Architect and Neural Librarian.
      Your task is to analyze a project's context (README, file structure, or description) and extract "Knowledge Atoms".
      These atoms will be stored in a Memory Bank to guide AI Agents.
      
      Categorize insights into:
      - 'rule': Strict constraints or standards.
      - 'preference': Subjective design/logic choices.
      - 'success_pattern': Methods that worked well.
      - 'error_fix': Lessons from past failures.
      
      Return a JSON array of objects with the following structure:
      [
        {
          "content": "Description of the insight",
          "type": "rule|preference|success_pattern|error_fix",
          "tags": ["tag1", "tag2"]
        }
      ]
      
      Be insightful, specific, and technical. Generate between 5 and 10 high-quality atoms.`;

      const prompt = `PROJECT CONTEXT:\n${context}${repoUrl ? `\nREPO URL: ${repoUrl}` : ""}\n\nBased on this, generate the Knowledge Atoms. Return ONLY the JSON.`;

      const response = await this.callModel(prompt, systemInstruction);
      const text = response.text?.trim() || "[]";
      
      try {
        const jsonMatch = text.match(/\[.*\]/s);
        return JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (e) {
        console.warn("[Ingestion] AI response parse error", text);
        return [];
      }
    } catch (error) {
      console.error("Project analysis failed", error);
      throw error;
    }
  },

  async semanticSearchMemories(queryStr: string, memories: any[]) {
    if (!queryStr.trim()) return memories;
    if (!memories || memories.length === 0) return [];
    
    const queryLower = queryStr.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
    console.log(`[Search] Query: "${queryLower}" | Local Dataset Size: ${memories.length}`);

    // 1. IMPROVED LOCAL FILTER (Fuzzy/Multi-word)
    const localMatches = memories.filter(m => {
      const content = (m.content || "").toLowerCase();
      const tags = (m.tags || []).map((t: string) => t.toLowerCase()).join(" ");
      const type = (m.type || "").toLowerCase();
      const searchTarget = `${content} ${tags} ${type}`;
      
      // If no words after splitting, fallback to simple includes
      if (queryWords.length === 0) return searchTarget.includes(queryLower);
      
      // All words must match for "High Relevance"
      return queryWords.every(word => searchTarget.includes(word));
    });

    // 2. FALLBACK TO ANY WORD MATCH IF NO FULL MATCHES
    let searchCandidates = localMatches;
    if (searchCandidates.length === 0 && queryWords.length > 0) {
      searchCandidates = memories.filter(m => {
        const content = (m.content || "").toLowerCase();
        const tags = (m.tags || []).map((t: string) => t.toLowerCase()).join(" ");
        const type = (m.type || "").toLowerCase();
        const searchTarget = `${content} ${tags} ${type}`;
        return queryWords.some(word => searchTarget.includes(word));
      });
    }

    // AI Augmentation skip for very short specific queries
    if (queryLower.length < 3 && searchCandidates.length > 0) return searchCandidates;

    // Strategy: If it's a specific search, prioritize local correctness.
    try {
      const prompt = `
        User is searching for: "${queryStr}"
        
        Knowledge Repository:
        ${memories.map((m, i) => `[ID: ${m.id}] Content: ${m.content} | Tags: ${m.tags?.join(', ')}`).join('\n')}
        
        TASK:
        Identify which Knowledge IDs are relevant to the user's search query.
        Include items that are semantically related (e.g., if searching for "professional", include "linkedin").
        Include items that provide context for the query.
        
        Return ONLY a JSON array of the IDs. Example: ["id1", "id2"]
      `;
      
      const response = await this.callModel(prompt, "You are a semantic search optimizer. Return ONLY a JSON array of IDs.");
      const text = response.text?.trim() || "[]";
      
      let semanticIds: string[] = [];
      try {
        const jsonMatch = text.match(/\[.*\]/s);
        semanticIds = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch (e) {
        console.warn("[Search] AI response parse error", text);
        semanticIds = [];
      }
      
      const semanticResults = memories.filter(m => Array.isArray(semanticIds) && semanticIds.includes(m.id));
      
      // MERGE & RANK
      // Local matches at the top, then new semantic insights
      const baseResults = searchCandidates.length > 0 ? searchCandidates : localMatches;
      const localIds = new Set(baseResults.map(m => m.id));
      const finalResults = [...baseResults];
      
      for (const sem of semanticResults) {
        if (!localIds.has(sem.id)) {
          finalResults.push(sem);
        }
      }

      console.log(`[Search] Success: ${baseResults.length} local, ${semanticResults.length} semantic results.`);
      return finalResults;
    } catch (error) {
      console.warn("[Search] AI augmentation skipped or failed:", error);
      return localMatches;
    }
  },

  async getAISettings() {
    try {
      // Wait for auth to initialize if needed
      let user = auth.currentUser;
      if (!user) {
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((u) => {
            unsubscribe();
            resolve(u);
          });
          // Timeout after 2 seconds
          setTimeout(resolve, 2000);
        });
        user = auth.currentUser;
      }

      if (!user) {
        console.warn("[AI Core] getAISettings: No user authenticated yet.");
        return null;
      }
      const settingsRef = doc(db, "userSettings", user.uid);
      const snap = await getDoc(settingsRef);
      if (!snap.exists()) {
        console.log("[AI Core] No custom settings found for user, using defaults.");
        return null;
      }
      const data = snap.data();
      console.log(`[AI Core] Settings Loaded. Provider: ${data?.preferredProvider || "gemini"}`);
      return data;
    } catch (error) {
      console.error("[AI Core] Error fetching AI settings:", error);
      return null;
    }
  },

  async callModel(prompt: string, systemInstruction: string, options?: { model?: string, provider?: 'gemini' | 'groq' }) {
    const settings = await this.getAISettings();
    
    // Determine provider: priority -> explicit option > user setting > default gemini
    const provider = options?.provider || settings?.preferredProvider || 'gemini';
    console.log(`[AI Core] Execution Request | Provider: ${provider} | Task: ${systemInstruction.substring(0, 30)}...`);
    
    // Helper to get env vars safely in Vite/Browser
    const getEnv = (key: string) => {
      // @ts-ignore
      return (typeof process !== 'undefined' ? process.env[key] : undefined) || 
             // @ts-ignore
             (import.meta.env ? import.meta.env[`VITE_${key}`] : undefined);
    };

    if (provider === 'groq') {
      const groqKey = settings?.groqApiKey || getEnv('GROQ_API_KEY');
      
      if (!groqKey) {
        console.warn("[AI Core] Groq requested but no API key found. FALLING BACK TO GEMINI.");
        return this.callModel(prompt, systemInstruction, { provider: 'gemini' });
      }
      
      try {
        console.log(`[AI Core] Routing to Groq | Key: ${groqKey.substring(0, 4)}...${groqKey.substring(groqKey.length - 4)}`);
        const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
        const response = await groq.chat.completions.create({
          model: options?.model || settings?.groqModel || "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        });
        
        const text = response.choices[0]?.message?.content || "";
        if (!text) throw new Error("Empty response from Groq");
        
        return { text };
      } catch (error: any) {
        console.error("[AI Core] Groq Fatal Error:", error);
        // Special handle for 401/403 or specific Groq errors to fallback if needed
        // But if Gemini is and only is the issue, we should probably throw here 
        // to let the user know their selected provider failed.
        // However, the requested fix is to "corregir analize project" which might be failing due to 429 on Gemini.
        console.warn("[AI Core] Attempting EMERGENCY fallback to Gemini after Groq failure.");
        return this.callModel(prompt, systemInstruction, { provider: 'gemini' });
      }
    } else {
      // DEFAULT: GEMINI
      try {
        const geminiKey = getEnv('GEMINI_API_KEY') || "";
        if (!geminiKey) {
          throw new Error("Gemini API Key missing in environment.");
        }

        console.log(`[AI Core] Routing to Gemini | Key: ${geminiKey.substring(0, 4)}...`);
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({ 
          model: options?.model || settings?.geminiModel || "gemini-2.0-flash",
          contents: prompt,
          config: {
            systemInstruction
          }
        });
        return { text: response.text || "" };
      } catch (error: any) {
        console.error("[AI Core] Gemini Fatal Error:", error);
        // Wrap 429 errors with more helpful context
        if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
          throw new Error("Gemini Rate Limit Exceeded (429). Please switch to Groq in Settings or wait for quota reset.");
        }
        throw new Error(error.message || "Failed to communicate with AI");
      }
    }
  },

  async callGemini(prompt: string, systemInstruction: string) {
    return this.callModel(prompt, systemInstruction, { provider: 'gemini' });
  },

  async transmitData(url: string, data: any) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: "AgentiCos Neural Bridge",
          timestamp: new Date().toISOString(),
          ...data
        })
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return { success: true };
    } catch (error: any) {
      console.error("Transmission Error:", error);
      throw error;
    }
  }
};
