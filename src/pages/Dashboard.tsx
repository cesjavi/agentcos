import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { auth } from "../lib/firebase";
import { where, orderBy, limit } from "firebase/firestore";
import { 
  Project, 
  Agent, 
  Task, 
  Execution,
  Memory
} from "../types";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Zap,
  X,
  Sparkles,
  Brain,
  Terminal,
  Activity
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { WorkflowDesigner } from "../components/VisualWorkflow";

function StatCard({ title, value, icon: Icon, description, trend }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-secondary rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {trend && <TrendingUp className="w-3 h-3 text-green-500" />}
          {description}
        </p>
        {title === "Active Projects" && value === 0 && (
          <Link 
            to="/projects" 
            className="mt-4 block text-center py-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-lg border border-primary/20 hover:bg-primary/20 transition-all"
          >
            Create First Project
          </Link>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const user = auth.currentUser;
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem("welcome_dismissed") !== "true";
  });

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("welcome_dismissed", "true");
  };
  
  const projectConstraints = useMemo(() => [
    where("ownerId", "==", user?.uid || "anonymous")
  ], [user?.uid]);

  const { data: projects } = useFirestoreCollection<Project>("projects", projectConstraints, {
    enabled: !!user
  });
  
  const { data: agents } = useFirestoreCollection<Agent>("agents", undefined, {
    enabled: !!user
  });

  const { data: memories } = useFirestoreCollection<Memory>("memories", undefined, {
    enabled: !!user
  });

  const statsExecutionsConstraints = useMemo(() => [
    orderBy("startedAt", "desc"),
    limit(50)
  ], []);

  const { data: statsExecutions } = useFirestoreCollection<Execution>("executions", statsExecutionsConstraints, {
    enabled: !!user
  });

  const recentExecutions = statsExecutions.slice(0, 5);

  const stats = useMemo(() => {
    if (statsExecutions.length === 0) return { successRate: 0, avgCost: 0 };
    const completed = statsExecutions.filter(ex => ex.status === "completed").length;
    const totalCost = statsExecutions.reduce((acc, ex) => acc + (ex.cost || 0), 0);
    return {
      successRate: (completed / statsExecutions.length) * 100,
      avgCost: totalCost / statsExecutions.length
    };
  }, [statsExecutions]);

  const chartData = useMemo(() => [
    { name: 'Mon', success: 42, latency: 1.2 },
    { name: 'Tue', success: 38, latency: 1.5 },
    { name: 'Wed', success: 55, latency: 1.1 },
    { name: 'Thu', success: 47, latency: 1.3 },
    { name: 'Fri', success: 62, latency: 1.0 },
    { name: 'Sat', success: 75, latency: 0.9 },
    { name: 'Sun', success: 88, latency: 0.8 },
  ], []);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start border-b border-border pb-6 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground">Monitor your autonomous agent collective.</p>
        </div>
      </header>

      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 md:p-4">
                <button 
                  onClick={dismissWelcome}
                  className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-primary" />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start relative z-10">
                <div className="space-y-3 md:space-y-4 max-w-md">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] md:text-xs font-black uppercase tracking-widest rounded-full">
                    <Sparkles className="w-3 h-3" />
                    New to AgentiCos?
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold">Welcome to the future of <span className="text-primary italic">autonomy</span>.</h2>
                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
                    AgentiCos is a neural orchestration platform where thoughts become actions. 
                    Manage specialized agent collectives that learn from every interaction.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 rounded-xl space-y-3 hover:border-primary/30 transition-colors">
                    <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-tighter">1. Create Projects</h4>
                    <p className="text-xs text-muted-foreground">Define high-level goals and context for your autonomous operations.</p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 rounded-xl space-y-3 hover:border-primary/30 transition-colors">
                    <div className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-tighter">2. Seed Memories</h4>
                    <p className="text-xs text-muted-foreground">Inject rules and patterns. Agents learn from feedback to optimize results.</p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 p-5 rounded-xl space-y-3 hover:border-primary/30 transition-colors">
                    <div className="w-8 h-8 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-tighter">3. Run Sequences</h4>
                    <p className="text-xs text-muted-foreground">Execute tasks through the Console and watch your OS work in real-time.</p>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <StatCard 
              title="Active Projects" 
              value={projects.length} 
              icon={Briefcase} 
              description="Projects under management"
            />
            <StatCard 
              title="Deployed Agents" 
              value={agents.length} 
              icon={Cpu} 
              description="Specialized AI workers"
            />
            <StatCard 
              title="Success Rate" 
              value={`${stats.successRate.toFixed(1)}%`} 
              icon={CheckCircle2} 
              description={statsExecutions.length > 0 ? `Based on last ${statsExecutions.length} runs` : "Deploy agents to begin"}
              trend={stats.successRate > 90}
            />
            <StatCard 
              title="Avg. Cost" 
              value={`$${stats.avgCost.toFixed(3)}`} 
              icon={Zap} 
              description="Per complex iteration"
            />
          </div>

          <section className="bg-card border border-border rounded-xl p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
               <div>
                  <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Global Collective Pulse
                  </h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Real-time visualization of your agent orchestration network</p>
               </div>
               <Link 
                to="/agents" 
                className="text-[10px] md:text-xs font-bold text-primary hover:underline"
               >
                 Manage Agents
               </Link>
            </div>
            <div className="bg-secondary/10 rounded-2xl border border-border/50 overflow-hidden">
               <div className="h-[300px] md:h-auto">
                 <WorkflowDesigner 
                   agents={agents} 
                   projectId={projects[0]?.id || ""} 
                   memoryCount={memories.length} 
                 />
               </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 border border-primary/20 bg-primary/5 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Onboarding Status</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { label: "Initialize Project", done: projects.length > 0, tip: "Go to Projects tab" },
              { label: "Configure Agents", done: agents.length > 0, tip: "Set up workers" },
              { label: "Seed Neural Memory", done: true, tip: "Memory Bank ready" }, // Assuming they see the bank
              { label: "Execute Sequence", done: statsExecutions.length > 0, tip: "Check the Console" }
            ].map((step, idx) => (
              <div key={idx} className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                step.done 
                  ? "bg-green-500/10 border-green-500/20 text-green-500" 
                  : "bg-card border-border hover:border-primary/30"
              )}>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase">{step.label}</span>
                  {!step.done && <span className="text-[10px] opacity-70 italic">{step.tip}</span>}
                </div>
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 animate-pulse" />
                )}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-primary"
                 initial={{ width: 0 }}
                 animate={{ width: `${([projects.length > 0, agents.length > 0, true, statsExecutions.length > 0].filter(Boolean).length / 4) * 100}%` }}
               />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center font-bold uppercase">
              System Integration: {Math.round(([projects.length > 0, agents.length > 0, true, statsExecutions.length > 0].filter(Boolean).length / 4) * 100)}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border p-4 md:p-6 rounded-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-semibold text-base md:text-lg">Execution Performance</h3>
            <div className="flex items-center gap-4 text-[10px] md:text-sm">
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-primary rounded-full"/> Success</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-muted rounded-full"/> Latency</div>
            </div>
          </div>
          <div className="h-[200px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ color: '#fafafa' }}
                />
                <Area type="monotone" dataKey="success" stroke="var(--primary)" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey="latency" stroke="#71717a" fillOpacity={0} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border p-4 md:p-6 rounded-xl space-y-6">
          <h3 className="font-semibold text-base md:text-lg text-red-500">System Anomaly Index</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                <div className="bg-red-500/10 text-red-500 p-2 rounded-lg h-fit shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Prompt Drift Detected</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Executor Agent-03 performance dropped below 80%</p>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tight">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
        <div className="p-4 md:p-6 border-b border-border">
          <h3 className="font-semibold text-lg">Recent Executions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-widest border-b border-border">
                <th className="px-6 py-4 font-normal">Execution ID</th>
                <th className="px-6 py-4 font-normal">Task</th>
                <th className="px-6 py-4 font-normal">Status</th>
                <th className="px-6 py-4 font-normal">Cost</th>
                <th className="px-6 py-4 font-normal">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentExecutions.map((ex) => (
                <tr key={ex.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">#{ex.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {projects.find(p => p.id === agents.find(a => a.id === ex.taskId)?.projectId)?.name || 
                     projects.find(p => p.id === (ex as any).projectId)?.name || 
                     "System Operation"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border",
                      ex.status === "completed" ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                      ex.status === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        ex.status === "completed" ? "bg-green-500" : 
                        ex.status === "failed" ? "bg-red-500" : "bg-amber-500"
                      )} />
                      {ex.status.charAt(0).toUpperCase() + ex.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">${(ex.cost || 0).toFixed(3)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {ex.startedAt ? format(ex.startedAt.toDate(), "HH:mm") : "-"}
                  </td>
                </tr>
              ))}
              {recentExecutions.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">No historical data found. Begin task sequence.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
