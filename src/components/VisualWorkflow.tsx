import React from "react";
import { motion } from "motion/react";
import { 
  Database, 
  Cpu, 
  ArrowRight, 
  BrainCircuit, 
  Settings, 
  FileText,
  CheckCircle2,
  Play,
  Plus
} from "lucide-react";
import { Agent, Memory } from "../types";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

interface NodeProps {
  id: string;
  type: 'trigger' | 'agent' | 'memory' | 'output';
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  isActive?: boolean;
  status?: 'online' | 'offline' | 'error';
  link?: string;
  delay?: number;
}

const Node = ({ type, label, subtitle, icon, isActive, status, link, delay = 0 }: NodeProps) => {
  const Container = link ? Link : "div";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative flex flex-col items-center"
    >
      <Container 
        to={link || "#"}
        className={cn(
          "relative z-10 p-5 rounded-2xl border-2 transition-all group w-48 bg-card shadow-xl",
          isActive ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/50",
          status === 'error' && "border-red-500/50"
        )}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className={cn(
            "p-3 rounded-xl transition-colors",
            isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:text-primary"
          )}>
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight">{label}</h4>
            {subtitle && <p className="text-[10px] text-muted-foreground uppercase font-medium mt-1">{subtitle}</p>}
          </div>
        </div>

        {status && (
          <div className="absolute -top-2 -right-2">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 border-card",
              status === 'online' ? "bg-green-500" : status === 'error' ? "bg-red-500" : "bg-zinc-500"
            )} />
          </div>
        )}
      </Container>
      
      {isActive && (
        <motion.div
          layoutId="active-glow"
          className="absolute inset-0 bg-primary/5 blur-2xl rounded-full -z-10"
        />
      )}
    </motion.div>
  );
};

const Connector = ({ active, animate = true, flowType }: { active?: boolean, animate?: boolean, flowType?: 'data' | 'system' }) => (
  <div className="relative w-16 h-0.5 bg-border/50 self-center mx-[-4px]">
    {active && animate && (
      <>
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ 
            repeat: Infinity, 
            duration: 2, 
            ease: "linear" 
          }}
          className={cn(
            "absolute inset-0 z-10",
            flowType === 'data' ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" : "bg-zinc-500"
          )}
        />
        {/* Continuous flow pips */}
        {[0, 0.5, 1, 1.5].map((delay) => (
          <motion.div
            key={delay}
            initial={{ left: "-10%", opacity: 0 }}
            animate={{ left: "110%", opacity: [0, 1, 1, 0] }}
            transition={{ 
              repeat: Infinity, 
              duration: 3, 
              delay,
              ease: "easeInOut" 
            }}
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full blur-[1px] shadow-lg shadow-primary/50"
          />
        ))}
      </>
    )}
  </div>
);

interface WorkflowDesignerProps {
  agents: Agent[];
  projectId: string;
  memoryCount: number;
  activeAgentRole?: string | null;
  variant?: 'full' | 'compact';
}

export function WorkflowDesigner({ agents, projectId, memoryCount, activeAgentRole, variant = 'full' }: WorkflowDesignerProps) {
  const planner = agents.find(a => a.role === 'planner');
  const executor = agents.find(a => a.role === 'executor');
  const reviewer = agents.find(a => a.role === 'reviewer');

  const isChainActive = !!activeAgentRole || agents.some(a => a.status === 'online');

  const containerPadding = variant === 'compact' ? "py-8 px-4" : "py-16 px-8";
  const gapSize = variant === 'compact' ? "gap-8" : "gap-16";
  const scaleClass = variant === 'compact' ? "scale-90" : "scale-100";

  return (
    <div className={cn(
      "w-full bg-secondary/20 rounded-[2.5rem] border border-border/40 overflow-hidden relative group",
      containerPadding
    )}>
      {/* Dynamic Background */}
      <div className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        variant === 'compact' && "opacity-50"
      )}>
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.03),transparent)] animate-pulse" />
         <div className="absolute inset-0 opacity-[0.03] grayscale invert" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
      </div>

      <div className={cn("flex flex-col relative z-10 transition-all", gapSize, scaleClass)}>
        
        {/* Layer 1: Entrance & Memory Integration */}
        {variant !== 'compact' && (
          <div className="grid grid-cols-4 items-end">
            <div className="col-start-2 flex flex-col items-center gap-6">
            <div className="relative">
              <Node 
                id="memory"
                type="memory"
                label="Neural Store"
                subtitle={`${memoryCount} Fragments`}
                icon={<BrainCircuit className="w-6 h-6" />}
                link="/memory-bank"
                isActive={activeAgentRole === 'system'}
                delay={0.1}
              />
              <motion.div 
                animate={{ 
                  scale: isChainActive ? [1, 1.1, 1] : 1,
                  opacity: isChainActive ? [0.4, 0.8, 0.4] : 0.2
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-0"
              >
                <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-transparent" />
                <ArrowRight className="rotate-90 w-4 h-4 text-primary absolute -bottom-2 -left-[7px]" />
              </motion.div>
            </div>
          </div>
        </div>
      )}

        {/* Layer 2: Pipeline Chain */}
        <div className="flex items-center justify-center">
            {/* Input Trigger */}
            <Node 
              id="input"
              type="trigger"
              label="Task Trigger"
              subtitle="Incoming Prompt"
              icon={<Play className="w-6 h-6" />}
              isActive={activeAgentRole === 'trigger'}
              delay={0.2}
            />

            <Connector active={!!planner} flowType="data" />

            {/* Planner Stage */}
            {planner ? (
              <Node 
                id="planner"
                type="agent"
                label={planner.name}
                subtitle="Strategic Planning"
                icon={<Settings className="w-6 h-6" />}
                status={planner.status}
                link={`/agent/${planner.id}`}
                isActive={activeAgentRole === 'planner' || planner.status === 'online'}
                delay={0.3}
              />
            ) : (
              <Node 
                id="add-planner"
                type="agent"
                label="Add Planner"
                subtitle="Empty Slot"
                icon={<Plus className="w-6 h-6" />}
                link={`/agents/new?projectId=${projectId}&role=planner`}
                delay={0.3}
              />
            )}

            <Connector active={!!executor} flowType="data" />

            {/* Executor Stage */}
            {executor ? (
              <Node 
                id="executor"
                type="agent"
                label={executor.name}
                subtitle="Logical Execution"
                icon={<Cpu className="w-6 h-6" />}
                status={executor.status}
                link={`/agent/${executor.id}`}
                isActive={activeAgentRole === 'executor' || executor.status === 'online'}
                delay={0.4}
              />
            ) : (
              <Node 
                id="add-executor"
                type="agent"
                label="Add Executor"
                subtitle="Empty Slot"
                icon={<Plus className="w-6 h-6" />}
                link={`/agents/new?projectId=${projectId}&role=executor`}
                delay={0.4}
              />
            )}

            <Connector active={!!reviewer} flowType="data" />

            {/* Reviewer Stage */}
            {reviewer ? (
              <Node 
                id="reviewer"
                type="agent"
                label={reviewer.name}
                subtitle="Outcome Audit"
                icon={<CheckCircle2 className="w-6 h-6" />}
                status={reviewer.status}
                link={`/agent/${reviewer.id}`}
                isActive={activeAgentRole === 'reviewer' || reviewer.status === 'online'}
                delay={0.5}
              />
            ) : (
              <Node 
                id="add-reviewer"
                type="agent"
                label="Add Reviewer"
                subtitle="Empty Slot"
                icon={<Plus className="w-6 h-6" />}
                link={`/agents/new?projectId=${projectId}&role=reviewer`}
                delay={0.5}
              />
            )}

            <Connector active={isChainActive} flowType="data" />

            {/* Outcome Node */}
            <Node 
              id="output"
              type="output"
              label="Polished Result"
              subtitle="Sequence Commit"
              icon={<FileText className="w-6 h-6" />}
              isActive={isChainActive && !activeAgentRole}
              delay={0.6}
            />
        </div>

        <div className="flex justify-center flex-col items-center gap-4">
          <div className="flex items-center gap-8 bg-card/50 backdrop-blur-md border border-border/50 px-6 py-3 rounded-2xl shadow-sm">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Neural Link Active</span>
             </div>
             <div className="w-px h-4 bg-border" />
             <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full transition-colors",
                  isChainActive ? "bg-primary animate-pulse" : "bg-zinc-500"
                )} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {isChainActive ? "Processing Stream" : "System Idle"}
                </span>
             </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono opacity-50">
            {isChainActive ? "LATENT FLOW: 240ms @ 2.4 T/S" : "WAITING FOR TRIGGER..."}
          </p>
        </div>
      </div>
    </div>
  );
}
