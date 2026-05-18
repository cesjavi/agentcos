import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Briefcase, 
  UserCircle2, 
  Settings, 
  Cpu, 
  History, 
  Database,
  Terminal,
  MessageSquareQuote,
  HelpCircle,
  X,
  BookOpen
} from "lucide-react";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: Briefcase },
  { to: "/agents", label: "Agents", icon: Cpu },
  { to: "/prompts", label: "Prompt Lab", icon: MessageSquareQuote },
  { to: "/executions", label: "Executions", icon: History },
  { to: "/memory", label: "Memory Bank", icon: Database },
];

export function Sidebar() {
  const [showGuide, setShowGuide] = useState(false);
  const [guideContent, setGuideContent] = useState("");

  useEffect(() => {
    if (showGuide && !guideContent) {
      fetch("/USER_GUIDE.md")
        .then(res => res.text())
        .then(text => setGuideContent(text))
        .catch(err => console.error("Failed to load user guide:", err));
    }
  }, [showGuide, guideContent]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border h-screen flex-col fixed left-0 top-0 z-40">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Terminal className="text-primary-foreground w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">AgentiCos</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-secondary text-primary" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )
              }
            >
              <link.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">User Guide</span>
          </button>
          
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive 
                  ? "bg-secondary text-primary" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )
            }
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 px-2 flex items-center justify-around">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )
            }
          >
            <link.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{link.label.split(' ')[0]}</span>
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px]",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground"
            )
          }
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Setts</span>
        </NavLink>
      </div>

      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuide(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card border border-border w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Instructions for Use</h3>
                </div>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="p-1 hover:bg-secondary rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="markdown-body prose prose-invert max-w-none">
                  {guideContent ? (
                    <ReactMarkdown>{guideContent}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
