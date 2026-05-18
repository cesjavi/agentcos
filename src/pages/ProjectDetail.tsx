import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { auth, db } from "../lib/firebase";
import { Project, Task, Agent, Memory } from "../types";
import { where, orderBy, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { 
  ChevronLeft, 
  Plus, 
  Cpu, 
  ListTodo, 
  Play, 
  Settings,
  MoreVertical,
  Activity,
  BrainCircuit,
  Tag,
  Layout,
  Trash2,
  RefreshCcw
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { WorkflowDesigner } from "../components/VisualWorkflow";
import { agentService } from "../services/agentService";

import { ConfirmationDialog } from "../components/ConfirmationDialog";

export function ProjectDetail() {
  const { id } = useParams();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const user = auth.currentUser;
  const projectConstraints = useMemo(() => [
     where("ownerId", "==", user?.uid || "anonymous")
  ], [user?.uid]);

  const { data: projectArr } = useFirestoreCollection<Project>("projects", projectConstraints, {
    enabled: !!user
  });
  
  const taskConstraints = useMemo(() => [
    where("projectId", "==", id || ""),
    orderBy("createdAt", "desc")
  ], [id]);

  const { data: tasks } = useFirestoreCollection<Task>("tasks", taskConstraints, {
    enabled: !!user && !!id
  });

  const agentConstraints = useMemo(() => [
    where("projectId", "==", id || "")
  ], [id]);

  const { data: agents } = useFirestoreCollection<Agent>("agents", agentConstraints, {
    enabled: !!user && !!id
  });

  const memoryConstraints = useMemo(() => [
    where("projectId", "==", id || "")
  ], [id]);

  const { data: memories } = useFirestoreCollection<Memory>("memories", memoryConstraints, {
    enabled: !!user && !!id
  });

  const project = projectArr.find(p => p.id === id);

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await agentService.deleteTask(taskToDelete);
      setTaskToDelete(null);
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const title = taskTitle.trim();
    const input = taskInput.trim();

    if (!title) {
        setError("Title is required.");
        return;
    }
    if (title.length > 150) {
        setError("Title must be 150 characters or less.");
        return;
    }
    if (!input) {
        setError("Context input is required.");
        return;
    }
    if (input.length > 25000) {
        setError("Context input must be 25,000 characters or less.");
        return;
    }

    if (!id) return;

    try {
      await addDoc(collection(db, "tasks"), {
        projectId: id,
        title,
        input,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setTaskTitle("");
      setTaskInput("");
      setError(null);
      setIsTaskModalOpen(false);
    } catch (error) {
      console.error("Error creating task:", error);
      setError("Failed to create task. Please try again.");
    }
  };

  if (!project && projectArr.length > 0) return <div className="p-8">Project not found</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-4">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <header className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5 truncate">
              <Link to="/projects" className="hover:text-primary shrink-0">Projects</Link>
              <span className="shrink-0">/</span>
              <span className="truncate">Detail</span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight truncate">{project?.name || "Loading..."}</h1>
          </header>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <div className="flex items-center bg-secondary/50 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              onClick={() => setViewMode('visual')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'visual' ? "bg-card shadow-sm text-rose-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layout className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
        <div className="lg:col-span-3 space-y-8">
           {viewMode === 'visual' ? (
             <WorkflowDesigner 
               agents={agents} 
               projectId={id || ""} 
               memoryCount={memories.length} 
             />
           ) : (
             <>
               {/* Summary Section */}
               <div className="bg-secondary/30 border border-border p-6 rounded-xl space-y-2">
                 <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Active Instructions</h3>
                 <p className="text-foreground/90">{project?.description || "No specific instructions for this project."}</p>
               </div>

               {/* Tasks Section */}
               <section className="space-y-4">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                   <div className="flex items-center gap-2">
                     <ListTodo className="w-5 h-5 text-primary" />
                     <h2 className="text-lg md:text-xl font-bold">Tasks</h2>
                   </div>
                   <button 
                    onClick={() => setIsTaskModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors"
                   >
                     <Plus className="w-4 h-4" />
                     Queue New Task
                   </button>
                 </div>

             <div className="space-y-3">
               {tasks.length === 0 ? (
                 <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground italic">
                   No tasks queued. Add a prompt to begin execution.
                 </div>
               ) : (
                 tasks.map(task => (
                   <div key={task.id} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 group hover:border-primary/30 transition-all">
                     <div className={cn(
                       "w-2 h-12 rounded-full",
                       task.status === 'completed' ? "bg-green-500" : 
                       task.status === 'running' ? "bg-primary animate-pulse" : "bg-muted"
                     )} />
                     <div className="flex-1 min-w-0">
                       <h4 className="font-semibold truncate">{task.title}</h4>
                       <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                         <span className="capitalize">{task.status}</span>
                         <span>•</span>
                         <span>{task.createdAt ? format(task.createdAt.toDate(), 'HH:mm') : 'Pending'}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <button 
                         onClick={() => setTaskToDelete(task.id)}
                         className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                         title="Delete Task"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       <Link 
                         to={`/executions/new?taskId=${task.id}`}
                         className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                         title="Relaunch Task"
                       >
                         <RefreshCcw className="w-4 h-4" />
                       </Link>
                       <Link 
                         to={`/executions/${task.currentExecutionId || 'new'}?taskId=${task.id}`}
                         className="p-3 bg-secondary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                       >
                         <Play className="w-4 h-4 fill-current" />
                       </Link>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </section>

           {/* Memory Section */}
           <section className="space-y-4">
              <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <BrainCircuit className="w-5 h-5 text-rose-500" />
                 <h2 className="text-xl font-bold">Neural Cache</h2>
               </div>
               <Link 
                 to="/memory-bank"
                 className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
               >
                 Manage Bank
               </Link>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {memories.slice(0, 4).map(memory => (
                 <div key={memory.id} className="bg-card border border-border p-4 rounded-xl space-y-3 hover:border-rose-500/30 transition-all">
                   <p className="text-xs text-foreground/80 line-clamp-2">{memory.content}</p>
                   <div className="flex flex-wrap gap-2">
                     {memory.tags.map(tag => (
                       <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary text-[8px] font-bold uppercase rounded border border-border">
                         <Tag className="w-2 h-2 opacity-50" />
                         {tag}
                       </span>
                     ))}
                   </div>
                 </div>
               ))}
               {memories.length === 0 && (
                  <div className="md:col-span-2 text-center py-8 border border-dashed border-border rounded-xl text-muted-foreground italic text-sm">
                   Neural cache is currently empty. Memories will be extracted on task completion.
                 </div>
               )}
             </div>
           </section>
             </>
           )}
        </div>

        {/* Sidebar: Agents */}
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Agents</h2>
              </div>
              <Link to={`/agents/new?projectId=${id}`} className="text-primary hover:opacity-80">
                <Plus className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-3 bg-secondary/50 border border-border rounded-lg">
                  <div className="w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center font-bold text-primary">
                    {agent.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter opacity-70">{agent.role}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                </div>
              ))}
              {agents.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">No agents deployed.</p>
              )}
            </div>
          </section>

          <section className="space-y-4 pt-4">
             <div className="flex items-center gap-2 border-b border-border pb-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Metrics</h2>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/30 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest h-8 flex items-center justify-center">Success</p>
                  <p className="text-xl font-bold">98%</p>
                </div>
                <div className="bg-secondary/30 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest h-8 flex items-center justify-center">Latent</p>
                  <p className="text-xl font-bold">1.2s</p>
                </div>
             </div>
          </section>
        </div>
      </div>

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card w-full max-w-md border-x border-t sm:border border-border rounded-t-3xl sm:rounded-xl shadow-2xl p-6 relative overflow-hidden"
          >
            <h2 className="text-xl md:text-2xl font-bold mb-6">New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Goal / Title</label>
                  <span className={cn(
                    "text-[10px]",
                    taskTitle.length > 150 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {taskTitle.length}/150
                  </span>
                </div>
                <input
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  maxLength={150}
                  className={cn(
                    "w-full bg-secondary border px-4 py-2 rounded-lg outline-none transition-colors text-sm",
                    taskTitle.length > 150 ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                  )}
                  placeholder="e.g. Write a marketing copy..."
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Historical Context</label>
                  <span className={cn(
                    "text-[10px]",
                    taskInput.length > 25000 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {taskInput.length.toLocaleString()}/25,000
                  </span>
                </div>
                <textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  maxLength={25000}
                  className={cn(
                    "w-full bg-secondary border px-4 py-2 rounded-lg outline-none transition-colors min-h-[120px] text-sm resize-none",
                    taskInput.length > 25000 ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                  )}
                  placeholder="Provide context, constraints..."
                />
              </div>
              <div className="flex gap-3 pt-4 pb-4">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-secondary text-foreground hover:bg-secondary/70 rounded-xl font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold transition-colors text-sm"
                >
                  Queue
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone and will stop any active executions."
      />
    </div>
  );
}
