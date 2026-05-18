import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { useState, useEffect } from "react";
import { auth, signInWithGoogle } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Real Pages
import { Dashboard } from "./pages/Dashboard";
import { ProjectList } from "./pages/ProjectList";
import { ProjectDetail } from "./pages/ProjectDetail";
import { ExecutionConsole } from "./pages/ExecutionConsole";
import { AgentList } from "./pages/AgentList";
import { AgentDetail } from "./pages/AgentDetail";
import { MemoryBank } from "./pages/MemoryBank";
import { PromptLab } from "./pages/PromptLab";
import { ExecutionHistory } from "./pages/ExecutionHistory";
import { Settings } from "./pages/Settings";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-background min-h-screen text-foreground pb-16 md:pb-0">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen relative">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 space-y-8 bg-card border border-border rounded-2xl text-center shadow-xl shadow-black/50"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter">AgentiCos</h1>
          <p className="text-muted-foreground">Sign in to start automating with multi-agents.</p>
        </div>
        <button
          onClick={() => signInWithGoogle()}
          className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
        >
          <LogIn className="w-5 h-5" />
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/projects" element={<Layout><ProjectList /></Layout>} />
        <Route path="/projects/:id" element={<Layout><ProjectDetail /></Layout>} />
        <Route path="/agents" element={<Layout><AgentList /></Layout>} />
        <Route path="/agents/:id" element={<Layout><AgentDetail /></Layout>} />
        <Route path="/prompts" element={<Layout><PromptLab /></Layout>} />
        <Route path="/executions" element={<Layout><ExecutionHistory /></Layout>} />
        <Route path="/executions/:id" element={<Layout><ExecutionConsole /></Layout>} />
        <Route path="/memory" element={<Layout><MemoryBank /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
