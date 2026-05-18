import { useState, useRef, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { auth, db } from "../lib/firebase";
import { Agent, Project, AgentRole, AgentStatus } from "../types";
import { where } from "firebase/firestore";
import { Cpu, Plus, Settings2, Trash2, Search, Filter, Edit3, Circle, Database, LayoutList, Zap, ShieldCheck, Gauge, Brain } from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import { agentService } from "../services/agentService";

const roleColors: Record<AgentRole, string> = {
  planner: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  executor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  reviewer: "text-green-500 bg-green-500/10 border-green-500/20",
  optimizer: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  memory: "text-pink-500 bg-pink-500/10 border-pink-500/20",
};

const roleIcons: Record<AgentRole, any> = {
  planner: LayoutList,
  executor: Zap,
  reviewer: ShieldCheck,
  optimizer: Gauge,
  memory: Brain,
};

const statusColors: Record<AgentStatus, string> = {
  online: "bg-green-500 shadow-green-500/50",
  offline: "bg-zinc-500 shadow-zinc-500/50",
  error: "bg-red-500 shadow-red-500/50",
};

export function AgentList() {
  const user = auth.currentUser;
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState<AgentRole>("executor");
  const [instructions, setInstructions] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const { data: agents } = useFirestoreCollection<Agent>("agents", undefined, {
    enabled: !!user
  });
  
  const projectConstraints = useMemo(() => [
    where("ownerId", "==", user?.uid || "anonymous")
  ], [user?.uid]);

  const { data: projects } = useFirestoreCollection<Project>("projects", projectConstraints, {
    enabled: !!user
  });

  useEffect(() => {
    const roleParam = searchParams.get("role") as AgentRole;
    const projectParam = searchParams.get("projectId");
    
    if (roleParam || projectParam) {
      if (roleParam) setRole(roleParam);
      if (projectParam) setProjectId(projectParam);
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const filteredAgents = agents.filter(a => {
    const searchLower = searchTerm.toLowerCase();
    const projectName = projects.find(p => p.id === a.projectId)?.name || "";
    return (
      a.name.toLowerCase().includes(searchLower) ||
      a.role.toLowerCase().includes(searchLower) ||
      projectName.toLowerCase().includes(searchLower)
    );
  });

  const openModal = (agent: Agent | null = null) => {
    if (agent) {
      setEditingAgent(agent);
      setName(agent.name);
      setRole(agent.role);
      setInstructions(agent.instructions);
      setProjectId(agent.projectId);
    } else {
      setEditingAgent(null);
      setName("");
      setRole("executor");
      setInstructions("");
      setProjectId("");
    }
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAgent(null);
    setName("");
    setInstructions("");
    setProjectId("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);

    if (!name.trim()) return setError("Agent name is required.");
    if (name.length > 64) return setError("Name is too long (max 64 chars).");
    if (!projectId) return setError("Please assign a project.");
    if (!instructions.trim()) return setError("Base instructions are required.");

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (editingAgent) {
        await agentService.updateAgent(editingAgent.id, {
          name: name.trim(),
          role,
          instructions: instructions.trim(),
          projectId
        });
      } else {
        await agentService.createAgent({
          name: name.trim(),
          role,
          instructions: instructions.trim(),
          projectId,
          modelConfig: {
            model: "gemini-2.0-flash",
            temperature: 0.7
          }
        });
      }
      closeModal();
    } catch (error) {
      console.error("Error saving agent:", error);
      setError("Failed to save agent. Check your permissions.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async (e: React.MouseEvent, agentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (submittingRef.current) {
      console.log("Deletion blocked: already submitting");
      return;
    }
    
    console.log("handleDeleteAgent triggered for:", agentId);
    
    // Temporarily removing confirm to verify if it works without it
    // if (!window.confirm("Are you sure?")) return;
    
    submittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      console.log("Calling agentService.deleteAgent directly...");
      await agentService.deleteAgent(agentId);
      console.log("Deletion call successful in component");
      // Add a small delay to allow Firestore to sync before unlocking
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Deletion failed in component:", error);
      alert("Failed to delete agent. Check console for details.");
    } finally {
      console.log("Deletion process cleanup");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agent Collective</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Configure and deploy specialized AI personae.</p>
        </header>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/memory"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-secondary border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/70 transition-all shadow-sm"
          >
            <Database className="w-4 h-4 text-primary" />
            <span className="hidden xs:inline">Memory Bank</span>
            <span className="xs:hidden">Memory</span>
          </Link>
          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Deploy Agent</span>
            <span className="xs:hidden">Deploy</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-secondary border border-border pl-10 pr-4 py-2 rounded-lg outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-secondary/70 transition-colors text-sm">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredAgents.map((agent) => (
          <div 
            key={agent.id} 
            className="group bg-card border border-border p-6 rounded-xl space-y-6 hover:border-primary/50 transition-all hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors relative">
                  {(() => {
                    const Icon = roleIcons[agent.role];
                    return Icon ? <Icon className="w-6 h-6" /> : <Cpu className="w-6 h-6" />;
                  })()}
                  <div className={cn(
                    "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-card shadow-sm",
                    statusColors[agent.status || "offline"]
                  )} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{agent.name}</h3>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      statusColors[agent.status || "offline"]
                    )} />
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border mt-1 font-mono",
                    roleColors[agent.role]
                  )}>
                    {(() => {
                      const Icon = roleIcons[agent.role];
                      return Icon ? <Icon className="w-3 h-3" /> : <Circle className="w-3 h-3" />;
                    })()}
                    {agent.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => openModal(agent)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  title="Edit Configuration"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <Link 
                  to={`/agents/${agent.id}`}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                >
                  <Settings2 className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Base Instructions</p>
                <p className="text-sm text-foreground/80 line-clamp-3 italic">"{agent.instructions || "No instructions provided."}"</p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Project: <span className="text-foreground font-medium">{projects.find(p => p.id === agent.projectId)?.name || "N/A"}</span>
                </div>
                <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleDeleteAgent(e, agent.id)}
                  className="text-xs text-red-500/50 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-30 p-1 rounded-md hover:bg-red-500/10"
                >
                  <Trash2 className={cn("w-3.5 h-3.5", isSubmitting && "animate-pulse")} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          onClick={closeModal}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card border-x border-t sm:border border-border p-6 sm:p-8 rounded-t-3xl sm:rounded-2xl w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl md:text-2xl font-bold mb-6">
              {editingAgent ? "Update Agent Configuration" : "Initialize New Agent"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent Name</label>
                  <span className={cn(
                    "text-[10px]",
                    name.length > 64 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {name.length}/64
                  </span>
                </div>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Content Planner Alpha"
                  className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Functional Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as AgentRole)}
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px] text-sm"
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
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px] text-sm"
                  >
                    <option value="">Select Project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Instructions</label>
                  <span className={cn(
                    "text-[10px]",
                    instructions.length > 2000 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {instructions.length}/2000
                  </span>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Define the agent's core competencies..."
                  className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors min-h-[120px] resize-none text-sm"
                />
              </div>
              <div className="flex gap-3 pt-4 pb-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-secondary font-bold transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? "Processing..." : editingAgent ? "Save Changes" : "Deploy Sequence"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
