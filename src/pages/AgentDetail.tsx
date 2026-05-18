import { useParams, Link } from "react-router-dom";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { Agent, Project, PromptVersion, AgentRole, AgentStatus } from "../types";
import { where, orderBy } from "firebase/firestore";
import { useState, useRef, useMemo } from "react";
import { agentService } from "../services/agentService";
import { auth } from "../lib/firebase";
import { 
  ChevronLeft, 
  Settings, 
  History, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Clock,
  ExternalLink,
  Edit3,
  Circle,
  MessageSquare,
  Star
} from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from "motion/react";

const statusColors: Record<AgentStatus, string> = {
  online: "text-green-500 bg-green-500/10 border-green-500/20",
  offline: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  error: "text-red-500 bg-red-500/10 border-red-500/20",
};

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const user = auth.currentUser;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState<AgentRole>("executor");
  const [instructions, setInstructions] = useState("");
  const [projectId, setProjectId] = useState("");

  // Feedback State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackCorrections, setFeedbackCorrections] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  
  const agentDetailConstraints = useMemo(() => [
    where("__name__", "==", id || "NONE")
  ], [id]);

  const { data: agents } = useFirestoreCollection<Agent>("agents", agentDetailConstraints, {
    enabled: !!user && !!id
  });

  const projectDetailOwnerConstraints = useMemo(() => [
    where("ownerId", "==", user?.uid || "anonymous")
  ], [user?.uid]);

  const { data: projects } = useFirestoreCollection<Project>("projects", projectDetailOwnerConstraints, {
    enabled: !!user
  });
  
  const versionConstraints = useMemo(() => [
    where("agentId", "==", id || "NONE"),
    orderBy("versionNumber", "asc")
  ], [id]);

  const { data: versions } = useFirestoreCollection<PromptVersion>("promptVersions", versionConstraints, {
    enabled: !!user && !!id
  });

  const agent = agents[0];

  if (!agent) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">Loading agent details...</p>
      </div>
    );
  }

  const openModal = () => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setInstructions(agent.instructions);
      setProjectId(agent.projectId);
      setIsModalOpen(true);
      setError(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || !id) return;
    setError(null);

    if (!name.trim()) return setError("Agent name is required.");
    if (!projectId) return setError("Please assign a project.");
    if (!instructions.trim()) return setError("Base instructions are required.");

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await agentService.updateAgent(id, {
        name: name.trim(),
        role,
        instructions: instructions.trim(),
        projectId
      });
      closeModal();
    } catch (error) {
      console.error("Error saving agent:", error);
      setError("Failed to save changes. Check your permissions.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setFeedbackError(null);

    if (feedbackRating === 0) return setFeedbackError("Please provide a rating.");

    setIsFeedbackSubmitting(true);
    try {
      await agentService.saveAgentFeedback(id, user.uid, {
        rating: feedbackRating,
        comment: feedbackComment.trim(),
        corrections: feedbackCorrections.trim(),
      });
      setFeedbackSuccess(true);
      setTimeout(() => {
        setIsFeedbackModalOpen(false);
        setFeedbackSuccess(false);
        setFeedbackRating(0);
        setFeedbackComment("");
        setFeedbackCorrections("");
      }, 2000);
    } catch (err) {
      console.error("Feedback error:", err);
      setFeedbackError("Failed to save feedback.");
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  // Prep chart data
  const chartData = versions.map(v => ({
    version: `v${v.versionNumber}`,
    score: v.performanceScore || 0,
    timestamp: v.createdAt?.toDate ? format(v.createdAt.toDate(), 'HH:mm') : 'N/A'
  }));

  const peakScore = Math.max(...versions.map(v => v.performanceScore || 0), 0);
  const currentScore = versions[versions.length - 1]?.performanceScore || 0;
  const previousScore = versions[versions.length - 2]?.performanceScore || 0;
  const scoreChange = currentScore - previousScore;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumbs & Header */}
      <nav className="flex items-center gap-4 text-sm">
        <Link to="/agents" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Agents
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="font-medium">{agent.name}</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings className="w-6 h-6" />
             </div>
             <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight">{agent.name}</h1>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border",
                    statusColors[agent.status || "offline"]
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full bg-current",
                      (agent.status === "online" || !agent.status) && "animate-pulse"
                    )} />
                    {agent.status || "offline"}
                  </div>
                </div>
                <p className="text-muted-foreground">Specialized {agent.role} controller</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/prompt-lab" 
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl font-bold text-sm bg-card hover:bg-secondary transition-all"
          >
            <Edit3 className="w-4 h-4" />
            Prompt Lab
          </Link>
          <button 
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl font-bold text-sm bg-card hover:bg-secondary transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
          </button>
          <button 
            onClick={openModal}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            Edit Configuration
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Config & Performance */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Performance Trend Chart */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-8 overflow-hidden relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Intelligence Evolution</h2>
                  <p className="text-xs text-muted-foreground">Performance variance across {versions.length} prompt iterations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Peak Accuracy</p>
                  <p className="text-2xl font-black text-foreground">{peakScore.toFixed(1)}%</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Current State</p>
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-2xl font-black text-primary">{currentScore.toFixed(1)}%</p>
                    {scoreChange !== 0 && (
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                        scoreChange > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {scoreChange > 0 ? "+" : ""}{scoreChange.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full -mx-4 md:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="version" 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#09090b', 
                      border: '1px solid #27272a', 
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)"
                    dot={{ r: 4, fill: '#09090b', strokeWidth: 2, stroke: 'var(--color-primary)' }}
                    activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Prompt Preview */}
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-bold">Active Instructions</h2>
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">
                v{versions[0]?.versionNumber || 1}.0.0
              </div>
            </div>
            <div className="p-8 bg-black/40">
              <pre className="font-mono text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap selection:bg-primary/20">
                {agent.instructions}
              </pre>
            </div>
          </section>
        </div>

        {/* Right Column: sidebar info */}
        <div className="space-y-8">
           {/* Model Config */}
           <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Runtime Engine
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                  <span className="text-xs text-muted-foreground font-medium">Engine</span>
                  <span className="text-sm font-mono font-bold uppercase">{agent.modelConfig.model}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                  <span className="text-xs text-muted-foreground font-medium">Temperature</span>
                  <span className="text-sm font-mono font-bold">{agent.modelConfig.temperature}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                  <span className="text-xs text-muted-foreground font-medium">Created</span>
                  <span className="text-sm font-medium">{agent.createdAt?.toDate ? format(agent.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
              </div>
           </section>

           {/* Version Quick Links */}
           <section className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Version History
              </h2>
              <div className="space-y-3">
                {versions.slice(0, 5).map(v => (
                  <div key={v.id} className="group p-3 border border-transparent hover:border-border hover:bg-secondary/30 rounded-xl transition-all cursor-default">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">v{v.versionNumber}.0.0</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        v.performanceScore > 90 ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {v.performanceScore?.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                      {v.changes}
                    </p>
                  </div>
                ))}
                {versions.length > 5 && (
                  <Link to="/prompt-lab" className="block text-center text-xs font-bold text-primary hover:underline pt-2">
                    View all {versions.length} iterations
                  </Link>
                )}
              </div>
           </section>

           {/* Actionable Stats */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/30 border border-border p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Latency</span>
                </div>
                <p className="text-xl font-bold">1.8s</p>
              </div>
              <div className="bg-secondary/30 border border-border p-4 rounded-2xl">
                 <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Cost/1k</span>
                </div>
                <p className="text-xl font-bold">$0.02</p>
              </div>
           </div>
        </div>
      </div>
      
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card border border-border p-8 rounded-2xl w-full max-w-lg relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">Update Agent Configuration</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Functional Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as AgentRole)}
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px]"
                  >
                    <option value="planner">Planner</option>
                    <option value="executor">Executor</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="optimizer">Optimizer</option>
                    <option value="memory">Memory</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project Scope</label>
                  <select 
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px]"
                  >
                    <option value="">Select Project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors min-h-[120px] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-secondary font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isFeedbackModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsFeedbackModalOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card border border-border p-8 rounded-2xl w-full max-w-lg relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Performance Feedback</h2>
                <p className="text-xs text-muted-foreground">Help optimize {agent.name}'s behavioral model</p>
              </div>
            </div>

            {feedbackSuccess ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Feedback Recorded</h3>
                <p className="text-muted-foreground">Thank you for helping us improve this agent.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                {feedbackError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                    {feedbackError}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Efficiency Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className="transition-transform active:scale-95"
                      >
                        <Star 
                          className={cn(
                            "w-8 h-8 transition-colors",
                            star <= feedbackRating ? "fill-amber-400 text-amber-400" : "text-border hover:text-amber-400/50"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance Notes</label>
                  <textarea
                    placeholder="Briefly describe the agent's performance..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors min-h-[100px] resize-none text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Suggested Corrections (Optional)</label>
                  <textarea
                    placeholder="Specific behavioral or instruction corrections..."
                    value={feedbackCorrections}
                    onChange={(e) => setFeedbackCorrections(e.target.value)}
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors min-h-[80px] resize-none text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-secondary font-bold transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFeedbackSubmitting}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                  >
                    {isFeedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
