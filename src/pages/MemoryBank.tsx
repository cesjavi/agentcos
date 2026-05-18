import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { Memory, Project } from "../types";
import { agentService } from "../services/agentService";
import { auth } from "../lib/firebase";
import { where, orderBy } from "firebase/firestore";
import { 
  Database, 
  Search, 
  Tag, 
  BrainCircuit, 
  AlertCircle, 
  CheckCircle,
  Lightbulb,
  Loader2,
  X,
  Plus,
  Heart,
  Trash2,
  Pin,
  PinOff,
  Copy,
  ExternalLink,
  Edit3,
  Send,
  Github,
  FolderOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle as AlertIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { ConfirmationDialog } from "../components/ConfirmationDialog";

const typeInfo = {
  preference: { icon: Heart, color: "text-rose-500", label: "User Preference" },
  error_fix: { icon: AlertCircle, color: "text-red-500", label: "Error Correction" },
  success_pattern: { icon: CheckCircle, color: "text-green-500", label: "Success Pattern" },
  rule: { icon: Lightbulb, color: "text-amber-500", label: "Business Rule" },
};

export function MemoryBank() {
  const user = auth.currentUser;
  const memoryConstraints = useMemo(() => [
    where("ownerId", "==", user?.uid || "anonymous"),
    orderBy("createdAt", "desc")
  ], [user?.uid]);

  const { data: allMemories } = useFirestoreCollection<Memory>("memories", memoryConstraints, {
    enabled: !!user
  });
  
  const projectConstraints = useMemo(() => [
    where("ownerId", "==", user?.uid || "anonymous")
  ], [user?.uid]);

  const { data: projects } = useFirestoreCollection<Project>("projects", projectConstraints, {
    enabled: !!user
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [displayMemories, setDisplayMemories] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [followupQuery, setFollowupQuery] = useState("");
  const [isFollowupLoading, setIsFollowupLoading] = useState(false);
  const lastSearchRef = useRef("");

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardConfig, setWizardConfig] = useState({
    projectId: "",
    repoUrl: "",
    context: ""
  });
  const [proposedAtoms, setProposedAtoms] = useState<any[]>([]);
  const [selectedAtoms, setSelectedAtoms] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);

  const handleFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupQuery.trim() || !synthesis) return;
    
    setIsFollowupLoading(true);
    try {
      const prompt = `Based on the previous search results and this synthesis:\n${synthesis}\n\nUser follow-up question: ${followupQuery}\n\nPlease answer based ONLY on the provided context if possible.`;
      const res = await agentService.callModel(prompt, "You are a Neural Librarian. Answer follow-up questions about retrieved knowledge.");
      setSynthesis(prev => `${prev}\n\n---\n**Q: ${followupQuery}**\n\n${res.text}`);
      setFollowupQuery("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsFollowupLoading(false);
    }
  };
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const submittingRef = useRef(false);

  // Form State
  const [projectId, setProjectId] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<Memory["type"]>("rule");
  const [tagsStr, setTagsStr] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const memoriesRef = useRef<Memory[]>([]);

  const sortedMemories = useMemo(() => {
    return [...allMemories].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0; // Maintain base order (desc index/time)
    });
  }, [allMemories]);

  const filteredAllMemories = useMemo(() => {
    if (selectedProjectId === "all") return sortedMemories;
    return sortedMemories.filter(m => m.projectId === selectedProjectId);
  }, [sortedMemories, selectedProjectId]);

  // Sync ref for effect stability
  useEffect(() => {
    memoriesRef.current = filteredAllMemories;
  }, [filteredAllMemories]);

  const popularTags = useMemo(() => {
    const tags = filteredAllMemories.flatMap(m => m.tags || []);
    const counts = tags.reduce((acc: any, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [filteredAllMemories]);

  const seedDemoData = async () => {
    if (!projects.length) return setError("Please create a project first.");
    setIsSeeding(true);
    try {
      const demoMemories = [
        { content: "User prefers concise bullet points for summaries.", type: "preference", tags: ["style", "formatting"] },
        { content: "Standard naming convention for AI models: 'Agent-[Role]-[ID]'.", type: "rule", tags: ["naming", "architecture"] },
        { content: "Always include a 'Source' footer in research documents.", type: "preference", tags: ["formatting", "research"] }
      ];
      for (const m of demoMemories) {
        await agentService.addMemory(projects[0].id, m as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (!hasSearched) {
      setDisplayMemories(filteredAllMemories);
    }
  }, [filteredAllMemories, hasSearched]);

  const distributionData = useMemo(() => {
    return [
      { name: 'Preference', value: filteredAllMemories.filter(m => m.type === 'preference').length, color: '#f43f5e' },
      { name: 'Correction', value: filteredAllMemories.filter(m => m.type === 'error_fix').length, color: '#ef4444' },
      { name: 'Patterns', value: filteredAllMemories.filter(m => m.type === 'success_pattern').length, color: '#22c55e' },
      { name: 'Rules', value: filteredAllMemories.filter(m => m.type === 'rule').length, color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [filteredAllMemories]);

  const deleteMemory = async () => {
    if (!memoryToDelete) return;
    try {
      await agentService.deleteMemory(memoryToDelete);
      setMemoryToDelete(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const togglePin = async (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await agentService.updateMemory(memory.id, { isPinned: !memory.isPinned });
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    // Simple visual feedback could be added here
  };

  const openEditModal = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setProjectId(memory.projectId);
    setContent(memory.content);
    setType(memory.type);
    setTagsStr(memory.tags?.join(", ") || "");
    setIsModalOpen(true);
  };

  const startAnalysis = async () => {
    if (!wizardConfig.projectId) {
      setError("Select a target project first.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const atoms = await agentService.analyzeProjectContext(wizardConfig.context, wizardConfig.repoUrl);
      setProposedAtoms(atoms);
      setSelectedAtoms(new Set(atoms.map((_: any, i: number) => i)));
      setWizardStep(3);
    } catch (err) {
      setError("AI analysis failed. Try providing more context.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const commitWizardAtoms = async () => {
    setIsSubmitting(true);
    try {
      const toAdd = proposedAtoms.filter((_, i) => selectedAtoms.has(i));
      for (const atom of toAdd) {
        await agentService.addMemory(wizardConfig.projectId, atom);
      }
      closeWizard();
    } catch (err) {
      setError("Failed to commit memories.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setProposedAtoms([]);
    setWizardConfig({ projectId: "", repoUrl: "", context: "" });
    setError(null);
  };

  const handleSearch = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setDisplayMemories(filteredAllMemories);
      setHasSearched(false);
      setSynthesis(null);
      lastSearchRef.current = "";
      return;
    }

    if (trimmedQuery === lastSearchRef.current) return;
    lastSearchRef.current = trimmedQuery;

    setIsSearching(true);
    setHasSearched(true);
    setSynthesis(null);
    try {
      const results = await agentService.semanticSearchMemories(trimmedQuery, memoriesRef.current);
      setDisplayMemories(results);
      
      // Perform AI Synthesis for semantic query
      if (results.length > 0) {
        agentService.synthesizeSearch(trimmedQuery, results).then(res => {
          setSynthesis(res);
        });
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle manual search form submission
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMemoryId(null);
    setProjectId("");
    setContent("");
    setType("rule");
    setTagsStr("");
    setError(null);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);

    if (!projectId) return setError("Please select a project.");
    if (!content.trim()) return setError("Memory content is required.");

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const memoryData = {
        content: content.trim(),
        type,
        tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean)
      };

      if (editingMemoryId) {
        await agentService.updateMemory(editingMemoryId, memoryData);
      } else {
        await agentService.addMemory(projectId, memoryData);
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save memory:", err);
      setError("Failed to save memory. Check permissions.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDisplayMemories(filteredAllMemories);
    setHasSearched(false);
    setSynthesis(null);
  };

  // Auto-search on query change with debounce
  useEffect(() => {
    if (!searchQuery.trim() && hasSearched) {
      setDisplayMemories(filteredAllMemories);
      setHasSearched(false);
      lastSearchRef.current = "";
      return;
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim() && searchQuery !== lastSearchRef.current) {
        handleSearch(searchQuery);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch, filteredAllMemories, hasSearched]);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Memory Bank</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Long-term persistent context extracted from interactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-secondary text-foreground hover:bg-secondary/80 border border-border px-4 py-2 rounded-lg text-sm font-medium transition-all group"
          >
            <Sparkles className="w-4 h-4 text-primary group-hover:animate-pulse" />
            <span className="hidden xs:inline">Neural Ingestion</span>
            <span className="xs:hidden">Neural</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Inject Memory</span>
            <span className="xs:hidden">Inject</span>
          </button>
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl hidden sm:block">
             <Database className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border p-4 md:p-6 rounded-2xl flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] md:text-sm font-bold uppercase tracking-widest">Neural Distribution</h3>
            </div>
            <div className="h-[150px] md:h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{allMemories.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Knowledge Units</p>
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Knowledge Utilization</h3>
            <div className="space-y-3">
              {[
                { label: 'Active Utilization', val: filteredAllMemories.filter(m => (m.useCount || 0) > 0).length, icon: CheckCircle, color: 'text-green-500' },
                { label: 'Latency Reducer', val: filteredAllMemories.filter(m => m.type === 'error_fix').length, icon: AlertCircle, color: 'text-red-500' },
                { label: 'Neural Stability', val: '98.2%', icon: BrainCircuit, color: 'text-blue-500' }
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2">
                    <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                    <span className="text-[10px] font-bold">{stat.label}</span>
                  </div>
                  <span className="text-xs font-black">{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex-1">
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2 block px-1">Project Focus</label>
               <div className="flex flex-wrap gap-2">
                 <button 
                   onClick={() => setSelectedProjectId("all")}
                   className={cn(
                     "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                     selectedProjectId === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"
                   )}
                 >
                   All Units
                 </button>
                 {projects.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => setSelectedProjectId(p.id)}
                     className={cn(
                       "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all truncate max-w-[150px]",
                       selectedProjectId === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"
                     )}
                   >
                     {p.name}
                   </button>
                 ))}
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Lightbulb className="w-24 h-24 rotate-12" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter rounded">
                  System Insight
                </div>
                <h2 className="text-xl font-bold leading-tight">Your agents are learning <span className="text-primary italic">faster</span> than average.</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The collective has identified {filteredAllMemories.filter(m => m.type === 'success_pattern').length} success patterns. 
                  These patterns have bypassed approximately {filteredAllMemories.reduce((acc, m) => acc + (m.useCount || 0), 0) * 12} seconds of redundant processing.
                </p>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Most Effective Fragment
                </h3>
                {filteredAllMemories.sort((a, b) => (b.useCount || 0) - (a.useCount || 0))[0] ? (
                  <div className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border/50 italic text-xs text-muted-foreground line-clamp-3">
                    "{filteredAllMemories.sort((a, b) => (b.useCount || 0) - (a.useCount || 0))[0].content}"
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground italic">No utilization data recorded yet.</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Impact: High</span>
                <span className="text-primary">Source: Verified Success</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
          <form onSubmit={onSearchSubmit} className="relative group">
        <Search className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 transition-colors",
          isSearching ? "text-primary animate-pulse" : "text-muted-foreground group-focus-within:text-primary"
        )} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Semantic neural search..."
          className="w-full bg-secondary/30 border border-border pl-10 md:pl-12 pr-10 md:pr-12 py-3 md:py-4 rounded-xl md:rounded-2xl outline-none focus:border-primary focus:bg-background transition-all text-sm md:text-lg shadow-sm"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchQuery && (
            <button 
              type="button"
              onClick={clearSearch}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                </div>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>

      {!hasSearched && popularTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-2">Try filtering by:</span>
          {popularTags.map(tag => (
            <button 
              key={tag}
              onClick={() => {
                setSearchQuery(tag);
                handleSearch(tag);
              }}
              className="px-2 py-1 bg-secondary hover:bg-primary/10 hover:text-primary rounded text-[10px] font-medium transition-colors border border-border"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      </div>

      {hasSearched && !isSearching && (
        <div className="flex items-center justify-between">
           <p className="text-sm text-muted-foreground">
             Found <span className="text-foreground font-bold">{displayMemories.length}</span> relevant results for "{searchQuery}"
           </p>
           <button 
            onClick={clearSearch}
            className="text-xs font-bold text-primary hover:underline"
           >
             Clear Search
           </button>
        </div>
      )}

      {hasSearched && (
        <AnimatePresence>
          {(isSearching || synthesis) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl overflow-hidden"
            >
              <div className="bg-primary/10 px-4 py-2 flex items-center justify-between border-b border-primary/20">
                <div className="flex items-center gap-2">
                  <BrainCircuit className={cn("w-4 h-4 text-primary", isSearching && "animate-pulse")} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Neural Synthesis</span>
                </div>
                {isSearching && (
                  <span className="text-[10px] text-primary/70 animate-pulse font-mono flex items-center gap-1.5">
                    Synthesizing Cognition...
                  </span>
                )}
              </div>
              <div className="p-5 md:p-6 prose prose-invert prose-sm max-w-none">
                {isSearching ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-primary/10 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-primary/10 rounded w-full animate-pulse" />
                    <div className="h-4 bg-primary/10 rounded w-1/2 animate-pulse" />
                  </div>
                ) : synthesis ? (
                  <div className="markdown-body text-foreground/80 leading-relaxed text-sm md:text-base mb-6">
                    <ReactMarkdown>{synthesis}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mb-6">Compiling insights from retrieved fragments...</p>
                )}

                {synthesis && !isSearching && (
                  <form onSubmit={handleFollowup} className="mt-4 pt-4 border-t border-primary/20 flex gap-2">
                    <input 
                      type="text" 
                      value={followupQuery}
                      onChange={(e) => setFollowupQuery(e.target.value)}
                      placeholder="Ask the brain for more details..."
                      className="flex-1 bg-background border border-primary/20 rounded-xl px-4 py-2 text-xs md:text-sm outline-none focus:border-primary transition-all shadow-sm"
                    />
                    <button 
                      type="submit"
                      disabled={isFollowupLoading || !followupQuery.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/10 text-xs"
                    >
                      {isFollowupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Query
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        <AnimatePresence mode="popLayout">
          {displayMemories.map((memory) => {
            const info = typeInfo[memory.type] || typeInfo.rule;
            const project = projects.find(p => p.id === memory.projectId);
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={memory.id} 
                className="bg-card border border-border p-6 rounded-2xl space-y-4 hover:shadow-xl hover:border-primary/30 transition-all border-l-4 border-l-primary/50 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                   <BrainCircuit className="w-12 h-12" />
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <info.icon className={cn("w-4 h-4", info.color)} />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", info.color)}>{info.label}</span>
                      {hasSearched && (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-primary/5 text-primary text-[8px] font-bold rounded border border-primary/10">
                          <BrainCircuit className="w-2.5 h-2.5" />
                          Neural Match
                        </div>
                      )}
                      {memory.isPinned && (
                        <span className="flex items-center gap-1 text-[8px] font-bold text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          <Pin className="w-2 h-2 fill-current" />
                          Pinned
                        </span>
                      )}
                    </div>
                    {project && (
                      <Link 
                        to={`/projects/${project.id}`}
                        className="text-[10px] font-medium text-muted-foreground uppercase opacity-70 hover:text-primary transition-colors flex items-center gap-1 group/link"
                      >
                        {project.name}
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden xs:flex items-center gap-1.5">
                      <button 
                        onClick={(e) => togglePin(memory, e)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all border",
                          memory.isPinned ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-secondary/50 border-border text-muted-foreground hover:border-amber-500/50 hover:text-amber-500"
                        )}
                        title={memory.isPinned ? "Unpin Memory" : "Pin Memory"}
                      >
                        {memory.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button 
                        onClick={(e) => copyToClipboard(memory.content, e)}
                        className="p-1.5 bg-secondary/50 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary rounded-lg transition-all"
                        title="Copy Content"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(memory)}
                        className="p-1.5 bg-secondary/50 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary rounded-lg transition-all"
                        title="Edit Memory"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemoryToDelete(memory.id);
                      }}
                      className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg flex items-center justify-center text-muted-foreground transition-all border border-transparent hover:border-destructive/20"
                      title="Evict Memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-foreground/90 leading-relaxed text-sm whitespace-pre-wrap">
                  {memory.content}
                </p>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {memory.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary text-muted-foreground rounded-lg text-[10px] font-bold lowercase border border-border group-hover:border-primary/20 transition-colors">
                      <Tag className="w-3 h-3 opacity-50" />
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {displayMemories.length === 0 && !isSearching && (
          <div className="md:col-span-2 flex flex-col items-center justify-center p-20 bg-secondary/20 border border-dashed border-border rounded-3xl text-center space-y-4">
             <BrainCircuit className="w-16 h-16 text-muted-foreground opacity-20" />
             <div className="space-y-2">
                <h3 className="font-bold text-xl">
                  {hasSearched ? "No matching memories found" : "Empty Neural Cache"}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {hasSearched 
                    ? "Try adjusting your search terms or broaden your query."
                    : "Memories are automatically generated after successful task completions or when you provide explicit corrections."}
                </p>
             </div>
             {hasSearched ? (
               <button 
                onClick={clearSearch}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
               >
                 View All Memories
               </button>
             ) : (
               <div className="flex flex-col sm:flex-row gap-4">
                 <button 
                   onClick={() => setIsModalOpen(true)}
                   className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                 >
                   Manually Inject Memory
                 </button>
                 <button 
                   onClick={seedDemoData}
                   disabled={isSeeding || projects.length === 0}
                   className="px-6 py-2 bg-secondary text-foreground rounded-full font-bold border border-border hover:bg-secondary/80 transition-all disabled:opacity-50"
                 >
                   {isSeeding ? "Seeding..." : "Seed Demo Data"}
                 </button>
               </div>
             )}
          </div>
        )}
      </div>
      </div>
      </div>

      {isWizardOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={closeWizard}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl w-full max-w-2xl relative shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Wizard Header */}
            <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Neural Ingestion Wizard</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Bulk Knowledge Extraction</p>
                </div>
              </div>
              <button onClick={closeWizard} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-secondary w-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: "33%" }}
                animate={{ width: wizardStep === 1 ? "33%" : wizardStep === 2 ? "66%" : "100%" }}
              />
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              {wizardStep === 1 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Select Intake Source</h3>
                    <p className="text-sm text-muted-foreground">Select how you want to provide project context for analysis.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setWizardStep(2)}
                      className="p-6 rounded-2xl border border-border bg-secondary/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col gap-4 group"
                    >
                      <Github className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div>
                        <h4 className="font-bold">Public Repository</h4>
                        <p className="text-xs text-muted-foreground">Analyze a Github repo via its public URL.</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        // @ts-ignore
                        input.webkitdirectory = true;
                        input.onchange = async (e: any) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          
                          setIsAnalyzing(true);
                          try {
                            let fullContext = "";
                            const maxFiles = 20;
                            let processed = 0;
                            
                            for (let i = 0; i < files.length && processed < maxFiles; i++) {
                              const file = files[i];
                              const name = file.name.toLowerCase();
                              // Only read text-based files
                              if (name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js')) {
                                const text = await file.text();
                                fullContext += `\n--- FILE: ${file.name} ---\n${text.substring(0, 2000)}\n`;
                                processed++;
                              }
                            }
                            
                            setWizardConfig(prev => ({ ...prev, context: fullContext }));
                            setWizardStep(2);
                          } catch (err) {
                            setError("Failed to read folder contents.");
                          } finally {
                            setIsAnalyzing(false);
                          }
                        };
                        input.click();
                      }}
                      className="p-6 rounded-2xl border border-border bg-secondary/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col gap-4 group"
                    >
                      <FolderOpen className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div>
                        <h4 className="font-bold">Local Folder</h4>
                        <p className="text-xs text-muted-foreground">Upload a project folder for structural analysis.</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {wizardStep === 2 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Configure Ingestion</h3>
                    <p className="text-sm text-muted-foreground">Point AgentiCos to your project assets.</p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-start gap-3">
                      <AlertIcon className="w-5 h-5 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Target Project</label>
                      <select 
                        value={wizardConfig.projectId}
                        onChange={(e) => setWizardConfig(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full bg-secondary border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors text-sm"
                      >
                        <option value="">Select a local project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Github URL (Optional)</label>
                      <input 
                        type="text"
                        placeholder="https://github.com/user/repo"
                        value={wizardConfig.repoUrl}
                        onChange={(e) => setWizardConfig(prev => ({ ...prev, repoUrl: e.target.value }))}
                        className="w-full bg-secondary border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Project Description / Context</label>
                      <textarea 
                        rows={5}
                        placeholder="Paste README content, system prompts, or stack details here..."
                        value={wizardConfig.context}
                        onChange={(e) => setWizardConfig(prev => ({ ...prev, context: e.target.value }))}
                        className="w-full bg-secondary border border-border px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors text-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setWizardStep(1)}
                      className="px-6 py-3 rounded-xl border border-border hover:bg-secondary font-bold transition-all text-sm flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button 
                      onClick={startAnalysis}
                      disabled={isAnalyzing || !wizardConfig.projectId || (!wizardConfig.repoUrl && !wizardConfig.context)}
                      className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing Neural Paths...
                        </>
                      ) : (
                        <>
                          Begin Analysis
                          <Sparkles className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {wizardStep === 3 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Extracted Knowledge Atoms</h3>
                    <p className="text-sm text-muted-foreground">The AI has identified the following fragments. Select which ones to commit.</p>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {proposedAtoms.map((atom, i) => {
                      const isSelected = selectedAtoms.has(i);
                      return (
                        <div 
                          key={i}
                          onClick={() => {
                            const next = new Set(selectedAtoms);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            setSelectedAtoms(next);
                          }}
                          className={cn(
                            "p-4 rounded-xl border transition-all cursor-pointer flex gap-4",
                            isSelected ? "bg-primary/5 border-primary/40" : "bg-secondary/20 border-border opacity-60 grayscale"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-secondary rounded border border-border">
                                {atom.type}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed">{atom.content}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {atom.tags?.map((t: string) => (
                                <span key={t} className="text-[8px] font-bold text-muted-foreground">#{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-border">
                    <button 
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-xl border border-border hover:bg-secondary font-bold transition-all text-sm flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Refine Input
                    </button>
                    <button 
                      onClick={commitWizardAtoms}
                      disabled={isSubmitting || selectedAtoms.size === 0}
                      className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Committing Logic...
                        </>
                      ) : (
                        <>
                          Commit {selectedAtoms.size} Atomics
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}

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
            <h2 className="text-xl md:text-2xl font-bold mb-6 italic flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              {editingMemoryId ? "Neural Refinement" : "Neural Injection"}
            </h2>
            <form onSubmit={handleAddMemory} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Project Cluster</label>
                <select 
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px] text-sm"
                >
                  <option value="">Select Target Project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Memory Type</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px] text-sm"
                  >
                    <option value="preference">Preference</option>
                    <option value="error_fix">Error Fix</option>
                    <option value="success_pattern">Success Pattern</option>
                    <option value="rule">Business Rule</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tags</label>
                  <input
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="tag1, tag2..."
                    className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors h-[42px] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cognitive Content</label>
                <textarea
                  autoFocus
                  placeholder="Knowledge to persist..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
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
                  {isSubmitting ? (editingMemoryId ? "Refining..." : "Injecting...") : (editingMemoryId ? "Update Fragment" : "Commit Memory")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={!!memoryToDelete}
        onClose={() => setMemoryToDelete(null)}
        onConfirm={deleteMemory}
        title="Evict Memory"
        description="Are you sure you want to evict this knowledge unit from the neural cache? This cannot be undone."
      />
    </div>
  );
}
