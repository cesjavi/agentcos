import { useState, useMemo } from "react";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { PromptVersion, Agent } from "../types";
import { 
  History, 
  ChevronRight, 
  Zap, 
  Diff, 
  CheckCircle2, 
  ArrowRight,
  Save,
  RotateCcw,
  Plus
} from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { agentService } from "../services/agentService";
import { where, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmationDialog } from "../components/ConfirmationDialog";

export function PromptLab() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newInstructions, setNewInstructions] = useState("");
  const [changeLog, setChangeLog] = useState("");
  const [inspectingVersion, setInspectingVersion] = useState<PromptVersion | null>(null);
  const [comparingVersions, setComparingVersions] = useState<PromptVersion[]>([]);
  const [versionToRevert, setVersionToRevert] = useState<PromptVersion | null>(null);

  const { data: agents } = useFirestoreCollection<Agent>("agents");
  
  const versionConstraints = useMemo(() => [
    where("agentId", "==", selectedAgentId || "NONE"),
    orderBy("versionNumber", "desc")
  ], [selectedAgentId]);

  const { data: versions } = useFirestoreCollection<PromptVersion>("promptVersions", versionConstraints);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleStartEdit = () => {
    if (selectedAgent) {
      setNewInstructions(selectedAgent.instructions);
      setIsEditing(true);
    }
  };

  const handleSaveVersion = async () => {
    if (!selectedAgent || !newInstructions.trim()) return;
    
    try {
      const nextVersion = (versions[0]?.versionNumber || 0) + 1;
      await agentService.createPromptVersion(
        selectedAgent.id,
        newInstructions,
        changeLog || "No documentation provided.",
        nextVersion
      );
      setIsEditing(false);
      setChangeLog("");
    } catch (error) {
      console.error("Failed to save version:", error);
    }
  };

  const handleRevert = async () => {
    if (!selectedAgent || !versionToRevert) return;
    try {
      await agentService.revertToVersion(selectedAgent.id, versionToRevert);
      setVersionToRevert(null);
    } catch (error) {
      console.error("Failed to revert:", error);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Prompt Lab</h1>
          <p className="text-muted-foreground">Version control and performance tracking for agent cores.</p>
        </div>
        {selectedAgent && !isEditing && (
          <button 
            onClick={handleStartEdit}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Iteration
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Agent Selector */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Select Agent</h3>
          <div className="space-y-1">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setIsEditing(false);
                  setInspectingVersion(null);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all text-left",
                  selectedAgentId === agent.id 
                    ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" 
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{agent.name}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-3 space-y-8">
          {!selectedAgentId ? (
            <div className="h-96 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground space-y-4">
               <History className="w-12 h-12 opacity-30" />
               <p>Select an agent to view its evolution timeline.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {isEditing ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">New Version Draft</h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm font-bold border border-border rounded-lg hover:bg-secondary transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveVersion}
                          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Publish v{(versions[0]?.versionNumber || 0) + 1}.0.0
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">System Instructions</label>
                        <textarea
                          value={newInstructions}
                          onChange={(e) => setNewInstructions(e.target.value)}
                          className="w-full h-[400px] bg-secondary/50 border border-border p-4 rounded-xl font-mono text-sm outline-none focus:border-primary transition-all resize-none"
                          placeholder="What makes this agent tick?"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Change Documentation</label>
                        <input
                          value={changeLog}
                          onChange={(e) => setChangeLog(e.target.value)}
                          placeholder="e.g. Optimized for data extraction accuracy, added few-shot examples..."
                          className="w-full bg-secondary/50 border border-border px-4 py-3 rounded-xl text-sm outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Evolution History</h2>
                    {versions.length > 0 && (
                      <div className="px-4 py-2 bg-secondary rounded-lg flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-primary" />
                        Avg Performance: {(versions.reduce((acc, v) => acc + (v.performanceScore || 0), 0) / versions.length).toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {versions.map((v) => (
                      <div key={v.id} className="relative pl-12">
                        <div className={cn(
                          "absolute left-[18px] top-2 w-3 h-3 rounded-full border-2 border-background z-10 transition-all",
                          selectedAgent.activePromptVersionId === v.id 
                            ? "bg-primary shadow-[0_0_8px_var(--primary)]" 
                            : "bg-muted"
                        )} />
                        
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-primary/30 transition-all">
                          <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
                            <div className="flex items-center gap-3">
                              <span className="text-xl font-bold">v{v.versionNumber}.0.0</span>
                              <span className="text-xs text-muted-foreground">
                                {v.createdAt?.toDate ? format(v.createdAt.toDate(), 'MMM d, yyyy HH:mm') : 'Just now'}
                              </span>
                              {selectedAgent.activePromptVersionId === v.id && (
                                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-tighter">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                               <div className={cn(
                                 "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
                                 v.performanceScore > 90 ? "text-green-500" : "text-amber-500"
                               )}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {v.performanceScore?.toFixed(1) || "TBD"} Score
                               </div>
                               {selectedAgent.activePromptVersionId !== v.id && (
                                 <button 
                                   onClick={() => setVersionToRevert(v)}
                                   className="flex items-center gap-1.5 text-xs bg-secondary text-foreground px-3 py-1.5 rounded-md font-bold hover:bg-primary hover:text-primary-foreground transition-all"
                                 >
                                   <RotateCcw className="w-3.5 h-3.5" />
                                   REVERT
                                 </button>
                               )}
                               <button 
                                 onClick={() => {
                                   if (comparingVersions.find(cv => cv.id === v.id)) {
                                     setComparingVersions(comparingVersions.filter(cv => cv.id !== v.id));
                                   } else if (comparingVersions.length < 2) {
                                     setComparingVersions([...comparingVersions, v]);
                                   }
                                 }}
                                 className={cn(
                                   "text-xs px-3 py-1.5 rounded-md font-bold transition-all border border-border",
                                   comparingVersions.find(cv => cv.id === v.id) 
                                     ? "bg-primary text-primary-foreground border-primary" 
                                     : "bg-secondary text-foreground hover:bg-primary/20"
                                 )}
                               >
                                 {comparingVersions.find(cv => cv.id === v.id) ? "Selected" : "Compare"}
                               </button>
                            </div>
                          </div>
                          
                          <div className="p-6">
                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Changes & Optimizations</label>
                              <p className="text-sm flex items-start gap-2">
                                <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                {v.changes}
                              </p>
                            </div>
                          </div>

                          <div className="bg-black/60 p-4 border-t border-border group relative">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Prompt Excerpt</p>
                            <code className="text-xs text-primary/70 block line-clamp-2 italic">
                              "{v.content}"
                            </code>
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                               <button 
                                 onClick={() => setInspectingVersion(v)}
                                 className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold shadow-xl"
                               >
                                  <Diff className="w-4 h-4" />
                                  Inspect Version {v.versionNumber}
                               </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {versions.length === 0 && (
                      <div className="pl-12 text-muted-foreground italic text-sm">
                        No previous versions recorded. Create your first iteration to start tracking.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inspection Modal */}
      <AnimatePresence>
        {inspectingVersion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
              onClick={() => setInspectingVersion(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card w-full max-w-4xl max-h-[80vh] border border-border rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">Version {inspectingVersion.versionNumber}.0.0</h3>
                  <p className="text-sm text-muted-foreground">{inspectingVersion.changes}</p>
                </div>
                <button 
                  onClick={() => setInspectingVersion(null)}
                  className="p-2 hover:bg-secondary rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
              <div className="p-8 overflow-y-auto flex-1">
                <pre className="bg-secondary/30 p-6 rounded-xl font-mono text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed border border-border">
                  {inspectingVersion.content}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {comparingVersions.length === 2 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full h-full border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Diff className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold">Side-by-Side Comparison</h2>
                </div>
                <button 
                  onClick={() => setComparingVersions([])}
                  className="bg-secondary px-4 py-2 rounded-lg font-bold hover:bg-destructive hover:text-white transition-all uppercase text-[10px] tracking-widest"
                >
                  Exit Comparison
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-2 divide-x divide-border overflow-hidden">
                {comparingVersions.sort((a, b) => a.versionNumber - b.versionNumber).map((v) => (
                  <div key={v.id} className="flex flex-col overflow-hidden">
                    <div className="p-4 bg-secondary/50 border-b border-border flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">Version</span>
                        <p className="font-bold text-lg">v{v.versionNumber}.0.0</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Performance</span>
                        <p className={cn("font-bold text-lg", (v.performanceScore || 0) > 90 ? "text-green-500" : "text-amber-500")}>
                          {v.performanceScore?.toFixed(1) || "TBD"}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-foreground/70 selection:bg-primary/20">
                      {v.content}
                    </div>
                    <div className="p-6 bg-secondary/20 border-t border-border mt-auto">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Change Log</span>
                      <p className="text-sm italic text-muted-foreground">"{v.changes}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationDialog 
        isOpen={!!versionToRevert}
        onClose={() => setVersionToRevert(null)}
        onConfirm={handleRevert}
        title="Revert Core Instructions"
        description={`Are you sure you want to revert to v${versionToRevert?.versionNumber}? This will immediately update the active instructions for the agent.`}
        confirmText="Execute Revert"
        variant="warning"
      />
    </div>
  );
}
