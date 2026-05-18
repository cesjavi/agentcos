import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { 
  Project, 
  Task, 
  Agent, 
  Execution, 
  ExecutionLog,
  Memory
} from "../types";
import { agentService } from "../services/agentService";
import { 
  Terminal, 
  Play, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  Star,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Loader2,
  Activity,
  Brain,
  Globe,
  ShieldCheck
} from "lucide-react";
import { where, orderBy } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowDesigner } from "../components/VisualWorkflow";

export function ExecutionConsole() {
  const { id } = useParams(); // executionId
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");
  const navigate = useNavigate();
  
  const [isRunning, setIsRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [corrections, setCorrections] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [isSavingToMemory, setIsSavingToMemory] = useState(false);
  const [hasSavedToMemory, setHasSavedToMemory] = useState(false);

  // Bridge State
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [isBridging, setIsBridging] = useState(false);
  const [bridgedSuccess, setBridgedSuccess] = useState(false);
  const [showBridgeConfig, setShowBridgeConfig] = useState(false);

  const [activeTab, setActiveTab] = useState<"terminal" | "result">("terminal");

  const logConstraints = useMemo(() => [
    where("executionId", "==", id || ""),
    orderBy("timestamp", "asc")
  ], [id]);

  const { data: logs } = useFirestoreCollection<ExecutionLog>("executionLogs", logConstraints);

  const taskConstraints = useMemo(() => [
    where("__name__", "==", taskId || "")
  ], [taskId]);

  const { data: tasks } = useFirestoreCollection<Task>("tasks", taskConstraints);
  const task = tasks[0];

  const executionConstraints = useMemo(() => [
    where("__name__", "==", id || "")
  ], [id]);

  const { data: executions } = useFirestoreCollection<Execution>("executions", executionConstraints);
  const execution = executions[0];

  const logEndRef = useRef<HTMLDivElement>(null);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (execution?.status === 'completed' && !isRunning) {
      setShowFeedback(true);
    }
  }, [execution?.status, isRunning]);

  useEffect(() => {
    const initExecution = async () => {
      if (id === "new" && taskId) {
        try {
          const newId = await agentService.createExecution(taskId);
          navigate(`/executions/${newId}?taskId=${taskId}`, { replace: true });
        } catch (error) {
          console.error("Failed to initialize execution:", error);
        }
      }
    };
    initExecution();
  }, [id, taskId, navigate]);

  useEffect(() => {
    if (logs.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [logs]);

  useEffect(() => {
    if (showFeedback) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }, 200);
    }
  }, [showFeedback]);

  const agentConstraints = useMemo(() => [
    where("projectId", "==", task?.projectId || "")
  ], [task?.projectId]);

  const { data: agents } = useFirestoreCollection<Agent>("agents", agentConstraints);

  const memoryConstraints = useMemo(() => [
    where("projectId", "==", task?.projectId || "")
  ], [task?.projectId]);

  const { data: memories } = useFirestoreCollection<Memory>("memories", memoryConstraints, {
    enabled: !!task?.projectId
  });

  const runSequence = async () => {
    if (!task || !id) return;
    setIsRunning(true);
    
    try {
      const getAgent = (role: string) => agents.find(a => a.role === role);

      // 0. Memory Retrieval - Parallelized setup
      setActiveAgent("system");
      const settings = await agentService.getAISettings();
      const currentProvider = settings?.preferredProvider || 'gemini';
      const currentModel = currentProvider === 'groq' ? (settings?.groqModel || "llama-3.3-70b-versatile") : (settings?.geminiModel || "gemini-2.0-flash");
      
      await agentService.addLog(id, "system", "Neural Synthesis", `Activating cognitive nodes [Provider: ${currentProvider.toUpperCase()}] [Model: ${currentModel}]`, "info");
      
      // Parallelize agent status updates and search expansion
      const [searchExpRes] = await Promise.all([
        agentService.callModel(
          `Task Title: ${task.title}\nTask Input: ${task.input}\n\nList 5 semantic topics for KB search. Comma-separated.`,
          "Extract search terms."
        ),
        ...agents.map(agent => agentService.updateAgentStatus(agent.id, "online"))
      ]);

      const expandedQuery = `${task.title} ${task.input} ${searchExpRes.text}`;
      await agentService.addLog(id, "system", "Deep Recall", `Searching project [${task.projectId}] for relevant knowledge units...`, "info");
      const relevantMemories = await agentService.findMemory(task.projectId, expandedQuery);
      
      if (relevantMemories.length > 0) {
        await agentService.addLog(
          id, 
          "system", 
          "Context Sync", 
          `Project focus locked. Synchronized ${relevantMemories.length} relevant knowledge units.`, 
          "result"
        );
      } else {
        await agentService.addLog(id, "system", "Context Neutral", "No specific project patterns found, using base intelligence.", "info");
      }

      const memoryContext = relevantMemories.length > 0 
        ? `\n--- CRITICAL PROJECT KNOWLEDGE (PAST EXPERIENCES) ---\n${relevantMemories.slice(0, 5).map((m, i) => `${i+1}. [Category: ${m.type}] ${m.content}`).join('\n')}\n--- END OF KNOWLEDGE ---\n`
        : "";

      // 1. Planner
      const planner = getAgent("planner");
      setActiveAgent("planner");
      await agentService.addLog(id, "system", "Initializing Planner", "Breaking down the goal into actionable steps.", "info");
      const planRes = await agentService.callModel(
        `${memoryContext}\nGoal: ${task.title}\n\nContext: ${task.input}\n\nTask: ${task.title}\n\nPlease create a step-by-step plan. Ensure you respect the [PAST EXPERIENCE & RULES] provided above.`,
        planner?.instructions || "You are a master planner agent."
      );
      await agentService.addLog(id, "planner", "Plan Generated", planRes.text, "result", planner?.activePromptVersionId);

      // 2. Executor
      const executor = getAgent("executor");
      setActiveAgent("executor");
      await agentService.addLog(id, "executor", "Execution Phase", "Starting step-by-step implementation...", "info");
      const executeRes = await agentService.callModel(
        `${memoryContext}Plan: ${planRes.text}\n\nTask: ${task.title}\n\nPlease perform the work and provide the final output.`,
        executor?.instructions || "You are an expert executor agent. Perform the task according to the plan provided."
      );
      await agentService.addLog(id, "executor", "Final Output Drafted", executeRes.text, "result", executor?.activePromptVersionId);

      // 3. Cognitive Review (Strict Audit)
      const reviewer = getAgent("reviewer");
      setActiveAgent("reviewer");
      await agentService.addLog(id, "system", "Cognitive Audit", "Peer agent is auditing the output against historical patterns.", "info");
      
      const auditPrompt = `
        TASK: ${task.title}
        ${memoryContext}
        
        OUTPUT TO AUDIT:
        ---
        ${executeRes.text}
        ---

        EVALUATION CRITERIA:
        1. Does it strictly follow the [PAST EXPERIENCE & RULES]?
        2. Is the tone consistent with prior successful patterns?
        
        If it FAILS any experience rule, start your response with "AUDIT_REJECTED: [detailed reason]".
        If it PASSES, return "AUDIT_PASSED" followed by your final polished version.
      `;

      const auditRes = await agentService.callModel(auditPrompt, reviewer?.instructions || "You are a context preservation audit agent.");
      
      let finalOutput = "";

      if (auditRes.text.startsWith("AUDIT_REJECTED")) {
        await agentService.addLog(id, "reviewer", "Integrity Breach Detected", auditRes.text, "info");
        await agentService.addLog(id, "system", "Refinement Phase", "Re-synthesizing content to align with project memories...", "info");
        
        const refinementRes = await agentService.callModel(
          `PRIOR OUTPUT:\n${executeRes.text}\n\nAUDIT CRITIQUE:\n${auditRes.text}\n\n${memoryContext}\n\nPlease generate the FIXED final version.`,
          reviewer?.instructions || ""
        );
        finalOutput = refinementRes.text;
        await agentService.addLog(id, "reviewer", "Neural Alignment Complete", "Output has been corrected and verified.", "result");
      } else {
        finalOutput = auditRes.text.replace("AUDIT_PASSED", "").trim();
        await agentService.addLog(id, "reviewer", "Review Complete", "Integrity verified. No cognitive conflicts found.", "info", reviewer?.activePromptVersionId);
      }

      await agentService.updateExecutionStatus(id, "completed", finalOutput);
      
      // AUTO-COMMIT: Register into Memory Bank
      try {
        await agentService.addMemory(task.projectId, {
          content: `Task Execution [${task.title}]: ${finalOutput.substring(0, 1000)}`,
          type: "task_result",
          tags: ["automated", "execution", task.title.toLowerCase().replace(/\s+/g, '-')]
        });
        setHasSavedToMemory(true);
      } catch (err) {
        console.warn("Auto-memory commit failed", err);
      }

      setShowFeedback(true);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "An unexpected neural sequence interruption occurred.";
      
      // Special handling for rate limits to guide the user
      let helpfulTip = "";
      if (errorMessage.includes("429") || errorMessage.includes("Quota") || errorMessage.includes("limit")) {
        helpfulTip = " [Action Required: Your Gemini quota might be exhausted. Go to Settings to switch to Groq or provide a custom key.]";
      }

      await agentService.addLog(id, "system", "Sequence Failed", `${errorMessage}${helpfulTip}`, "error");
      await agentService.updateExecutionStatus(id, "failed");
      
      // Update agent statuses to error
      for (const agent of agents) {
        await agentService.updateAgentStatus(agent.id, "error");
      }
    } finally {
      setIsRunning(false);
      setActiveAgent(null);
    }
  };

  const handleManualSave = async () => {
    if (!execution?.result || !task?.projectId) return;
    setIsSavingToMemory(true);
    try {
      await agentService.addMemory(task.projectId, {
        content: execution.result,
        type: "manual_commit",
        tags: ["curated-knowledge", "execution-result"]
      });
      setHasSavedToMemory(true);
    } catch (error) {
      console.error("Manual save failed:", error);
    } finally {
      setIsSavingToMemory(false);
    }
  };

  const handleTransmit = async () => {
    if (!execution?.result || !bridgeUrl) return;
    setIsBridging(true);
    try {
      await agentService.transmitData(bridgeUrl, {
        task: task?.title,
        result: execution.result,
        projectId: task?.projectId
      });
      setBridgedSuccess(true);
      setTimeout(() => setBridgedSuccess(false), 5000);
      setShowBridgeConfig(false);
    } catch (error: any) {
      console.error("Transmission failed:", error);
      alert("Bridge transmission failed: " + error.message);
    } finally {
      setIsBridging(false);
    }
  };

  const handleCopy = () => {
    if (!execution?.result) return;
    navigator.clipboard.writeText(execution.result);
    alert("Copied to clipboard!");
  };

  const handleFeedback = async () => {
    if (!id || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      await agentService.saveFeedback(id, {
        rating,
        comment,
        corrections,
        isApproved: rating >= 4
      });
      alert("Feedback saved! Agents will learn from this.");
      setShowFeedback(false);
    } catch (error) {
      console.error("Feedback failed:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="p-3 md:p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <Link to={`/projects/${task?.projectId}`} className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-sm md:text-base truncate">{task?.title || "Execution"}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
              ID: <span className="font-mono">{id?.slice(0, 8)}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <button 
            onClick={() => setShowWorkflow(!showWorkflow)}
            className={cn(
              "p-2 rounded-lg transition-colors border hidden sm:block",
              showWorkflow ? "bg-primary/20 border-primary text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            )}
            title="Toggle Visual Workflow"
          >
            <Activity className="w-5 h-5" />
          </button>
          <div className="hidden sm:block h-6 w-px bg-border mx-1" />
          {execution?.status === 'starting' && !isRunning && (
            <button 
              onClick={runSequence}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:opacity-90"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="hidden xs:inline">Start Sequence</span>
              <span className="xs:hidden">Start</span>
            </button>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 bg-secondary rounded-lg text-[10px] md:text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin text-primary" />
              <span className="hidden xs:inline">Agent Working...</span>
              <span className="xs:hidden">Running</span>
            </div>
          )}
          {execution?.status === 'completed' && (
            <div className="flex items-center gap-2 shrink-0">
              <Link 
                to={`/executions/new?taskId=${taskId}`}
                className="flex items-center gap-2 bg-secondary text-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-secondary/70 border border-border"
              >
                <RefreshCcw className="w-4 h-4" />
                <span className="hidden xs:inline">Relaunch</span>
              </Link>
              <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-[10px] md:text-sm font-medium">
                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden xs:inline">Execution Successful</span>
                <span className="xs:hidden">Done</span>
              </div>
            </div>
          )}
          {execution?.status === 'failed' && (
             <Link 
                to={`/executions/new?taskId=${taskId}`}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium hover:opacity-90 transition-all border border-primary/20 shadow-lg shadow-primary/20"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Retry Sequence</span>
              </Link>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showWorkflow && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-card/30"
          >
            <div className="p-4">
              <WorkflowDesigner 
                agents={agents} 
                projectId={task?.projectId || ""} 
                memoryCount={memories.length} 
                activeAgentRole={activeAgent}
                variant="compact"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Tabs */}
      <div className="md:hidden flex h-12 bg-card border-b border-border sticky top-[61px] z-10 shrink-0">
        <button 
          onClick={() => setActiveTab("terminal")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
            activeTab === "terminal" ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-transparent"
          )}
        >
          <Terminal className="w-4 h-4" />
          Terminal
        </button>
        <button 
          onClick={() => setActiveTab("result")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2 relative",
            activeTab === "result" ? "text-primary border-primary bg-primary/5" : "text-muted-foreground border-transparent"
          )}
        >
          <Activity className="w-4 h-4" />
          Result
          {execution?.status === 'completed' && activeTab === 'terminal' && (
            <span className="absolute top-2 right-4 w-2 h-2 bg-green-500 rounded-full animate-ping" />
          )}
        </button>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-2">
        {/* Left: Terminal Console */}
        <div className={cn(
          "flex flex-col border-r border-border bg-black/40 min-h-0 md:flex",
          activeTab === "terminal" ? "flex flex-1" : "hidden"
        )}>
          <div className="p-3 border-b border-border flex items-center justify-between text-[10px] md:text-xs font-mono text-muted-foreground uppercase shrink-0">
            <span>Terminal Logs</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden xs:inline">Live Stream</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 font-mono text-xs md:text-sm scroll-smooth">
            {logs.map((log) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                key={log.id} 
                className="space-y-1"
              >
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                  <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">[{log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}]</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] md:text-[10px] bg-secondary uppercase font-bold shrink-0",
                    log.type === 'error' ? "text-red-500 bg-red-500/10" : 
                    log.type === 'result' ? "text-blue-500 bg-blue-500/10" : ""
                  )}>
                    {log.agentId}
                  </span>
                  <span className="text-primary/80 font-bold text-[10px] md:text-sm truncate max-w-[150px]">{log.step}</span>
                </div>
                <div className={cn(
                  "pl-0 md:pl-[88px] text-muted-foreground leading-relaxed whitespace-pre-wrap text-[11px] md:text-sm",
                  log.type === 'result' && "text-foreground bg-secondary/30 p-2 rounded-lg border border-border mt-2"
                )}>
                  {log.content}
                </div>
              </motion.div>
            ))}
            <div ref={logEndRef} />
            {isRunning && (
              <div className="pl-0 md:pl-[88px] flex items-center gap-2 text-primary text-[10px] md:text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="animate-pulse">Expecting input from {activeAgent}...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Result & Feedback */}
        <div className={cn(
          "flex flex-col bg-card min-h-0 relative md:flex",
          activeTab === "result" ? "flex flex-1" : "hidden"
        )}>
          <div className="p-3 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-md text-[10px] md:text-xs font-mono text-muted-foreground uppercase h-[41px] shrink-0 sticky top-0 z-10">
            <span>Result Output</span>
            <div className="flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              <span className="hidden xs:inline">Markdown Preview</span>
            </div>
          </div>
          
          <div 
            ref={resultContainerRef}
            className="flex-1 overflow-y-auto scroll-smooth flex flex-col"
          >
            <div className="p-4 md:p-8">
              {execution?.result ? (
                <div className="space-y-6">
                  <div className="markdown-body prose prose-invert max-w-none text-sm md:text-base">
                    <ReactMarkdown>{execution.result}</ReactMarkdown>
                  </div>
                  
                  <div className="pt-6 border-y border-border bg-primary/5 -mx-4 md:-mx-8 px-4 md:px-8 py-6 my-6 flex flex-col sm:flex-row gap-6">
                    <div className="flex flex-col gap-1.5 flex-1 pr-0 md:pr-4">
                       <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Neural Feedback Loop</span>
                       {hasSavedToMemory ? (
                         <div className="flex items-center gap-2 text-green-500 text-xs font-bold animate-in slide-in-from-left duration-500">
                           <CheckCircle2 className="w-5 h-5" />
                           Knowledge successfully integrated
                         </div>
                       ) : (
                         <div className="space-y-2">
                            <p className="text-xs text-muted-foreground leading-snug">
                              Should the agents remember this specific result for future similar tasks? 
                            </p>
                            <button
                              onClick={handleManualSave}
                              disabled={isSavingToMemory}
                              className="flex items-center gap-2 text-primary font-bold hover:text-primary/80 transition-colors group text-sm"
                            >
                              {isSavingToMemory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                              Archive Outcome
                            </button>
                         </div>
                       )}
                    </div>
                    <div className="shrink-0 flex items-center justify-center">
                      <button 
                        onClick={() => {
                          setShowFeedback(true);
                          setTimeout(() => {
                            feedbackRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-widest"
                      >
                        Refine Result
                      </button>
                    </div>
                  </div>

                  {/* REAL WORLD BRIDGE SECTION */}
                  <div className="bg-secondary/10 border border-border p-4 md:p-6 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        <h4 className="font-bold">Real-World Bridge</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={handleCopy}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                        >
                          Copy Local
                        </button>
                        {!showBridgeConfig && (
                          <button 
                            onClick={() => setShowBridgeConfig(true)}
                            className="flex-1 sm:flex-none px-3 py-1.5 bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/30 transition-all"
                          >
                            Bridge Link
                          </button>
                        )}
                      </div>
                    </div>

                    {!showBridgeConfig && !bridgedSuccess && (
                      <p className="text-[10px] md:text-xs text-muted-foreground italic">
                        Agents are ready to transmit this intelligence to external platforms.
                      </p>
                    )}

                    {bridgedSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3 text-green-500"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">Intelligence Packet Transmitted</p>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {showBridgeConfig && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                              External Webhook URL
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input 
                                type="url" 
                                value={bridgeUrl}
                                onChange={(e) => setBridgeUrl(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-primary transition-colors min-w-0"
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={handleTransmit}
                                  disabled={isBridging || !bridgeUrl}
                                  className="flex-1 sm:flex-none bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isBridging ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                                  Transmit
                                </button>
                                <button 
                                  onClick={() => setShowBridgeConfig(false)}
                                  className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-4 italic opacity-50 text-center text-xs md:text-sm">
                  <RefreshCcw className="w-8 h-8 md:w-12 md:h-12 stroke-[1px] animate-spin-slow" />
                  <p>Awaiting neural synthesis results...</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showFeedback && (
                <motion.div 
                  ref={feedbackRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 md:p-6 border-t border-border bg-secondary/30 backdrop-blur-xl mt-auto"
                >
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg md:text-xl font-bold">How was the result?</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">Your feedback improves future loops.</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={cn(
                              "p-1.5 md:p-2 rounded-lg transition-all",
                              rating >= star ? "text-yellow-500 scale-110" : "text-muted-foreground hover:text-yellow-500/50"
                            )}
                          >
                            <Star className={cn("w-5 h-5 md:w-6 md:h-6", rating >= star && "fill-current")} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Review</label>
                          <textarea
                            placeholder="General feedback..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full bg-card border border-border rounded-xl p-3 min-h-[80px] md:min-h-[100px] text-xs md:text-sm outline-none focus:border-primary transition-colors resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Corrections</label>
                          <textarea
                            placeholder="Corrected text..."
                            value={corrections}
                            onChange={(e) => setCorrections(e.target.value)}
                            className="w-full bg-card border border-border rounded-xl p-3 min-h-[80px] md:min-h-[100px] text-xs md:text-sm outline-none focus:border-primary transition-colors font-mono resize-none"
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                           onClick={handleFeedback}
                           disabled={isSubmittingFeedback}
                           className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 text-xs md:text-sm"
                        >
                          {isSubmittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
                          Approve Learning
                        </button>
                        <button 
                          onClick={() => { setRating(1); handleFeedback(); }}
                          disabled={isSubmittingFeedback}
                          className="px-6 border border-border py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50 text-xs md:text-sm"
                        >
                          {isSubmittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
