import { useFirestoreCollection } from "../hooks/useFirestore";
import { Execution, Task } from "../types";
import { auth } from "../lib/firebase";
import { 
  History, 
  Search, 
  Calendar, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Activity,
  Filter
} from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { orderBy, limit, where } from "firebase/firestore";
import { useState, useMemo } from "react";

export function ExecutionHistory() {
  const user = auth.currentUser;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const historyConstraints = useMemo(() => [
    orderBy("startedAt", "desc"),
    limit(50)
  ], []);

  const { data: executions } = useFirestoreCollection<Execution>("executions", historyConstraints, {
    enabled: !!user
  });
  
  const { data: tasks } = useFirestoreCollection<Task>("tasks", undefined, {
    enabled: !!user
  });

  const filteredExecutions = executions.filter(ex => {
    const task = tasks.find(t => t.id === ex.taskId);
    const matchesStatus = statusFilter === "all" || ex.status === statusFilter;
    const matchesSearch = 
      ex.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task?.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Execution History</h1>
          <p className="text-muted-foreground">Historical record of all agentic operations and outcomes.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-secondary/50 border border-border px-4 py-2 rounded-xl flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                   {filteredExecutions.length !== executions.length ? "Matches" : "Total Runs"}
                 </p>
                 <p className="text-lg font-bold">
                   {filteredExecutions.length}
                   {filteredExecutions.length !== executions.length && (
                     <span className="text-xs text-muted-foreground ml-1 font-normal overflow-hidden">
                       of {executions.length}
                     </span>
                   )}
                 </p>
              </div>
           </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Execution ID or Task Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary border border-border pl-10 pr-4 py-3 rounded-xl outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 bg-secondary border border-border px-3 rounded-xl min-w-[200px]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            className="w-full bg-transparent py-3 outline-none text-sm appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] border-b border-border bg-secondary/30">
                <th className="px-6 py-4 font-normal">Timestamp</th>
                <th className="px-6 py-4 font-normal">Task Reference</th>
                <th className="px-6 py-4 font-normal">Status</th>
                <th className="px-6 py-4 font-normal text-right">Metrics</th>
                <th className="px-6 py-4 font-normal"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExecutions.map((ex) => {
                const task = tasks.find(t => t.id === ex.taskId);
                return (
                  <tr key={ex.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 min-w-[200px]">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-secondary rounded-lg">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{ex.startedAt ? format(ex.startedAt.toDate(), 'MMMM d, yyyy') : 'Recently'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{ex.startedAt ? format(ex.startedAt.toDate(), 'HH:mm:ss') : '-'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="max-w-md">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{task?.title || "Unknown Task"}</p>
                          <p className="text-xs text-muted-foreground truncate opacity-70">ID: {ex.id.slice(0, 12)}...</p>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          ex.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                          ex.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          "bg-primary/10 text-primary border-primary/20"
                        )}>
                          {ex.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : 
                           ex.status === 'failed' ? <AlertCircle className="w-3 h-3" /> : 
                           <Activity className="w-3 h-3 animate-pulse" />}
                          {ex.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-mono font-bold">${ex.cost || "0.00"}</span>
                          <span className="text-[10px] text-muted-foreground">{ex.tokenUsage?.totalTokens || 0} tokens</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Link 
                        to={`/executions/${ex.id}?taskId=${ex.taskId}`}
                        className="inline-flex items-center justify-center p-2 bg-secondary/50 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                       >
                         <ChevronRight className="w-4 h-4" />
                       </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredExecutions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic">
                    {executions.length === 0 
                      ? "The history is silent. No autonomous actions recorded yet." 
                      : "No records match your current filtering criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
