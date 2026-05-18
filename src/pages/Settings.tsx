import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { 
  Settings as SettingsIcon, 
  Database, 
  Trash2, 
  ShieldCheck, 
  Key, 
  Globe,
  Plus,
  Loader2,
  Cpu,
  Save
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export function Settings() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Provider Settings
  const [preferredProvider, setPreferredProvider] = useState<'gemini' | 'groq'>('gemini');
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [githubToken, setGithubToken] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "userSettings", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setPreferredProvider(data.preferredProvider || 'gemini');
        setGroqApiKey(data.groqApiKey || "");
        setGroqModel(data.groqModel || "llama-3.3-70b-versatile");
        setGeminiModel(data.geminiModel || "gemini-2.0-flash");
        setGithubToken(data.githubToken || "");
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "userSettings", user.uid), {
        preferredProvider,
        groqApiKey,
        groqModel,
        geminiModel,
        githubToken,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const seedDemoData = async () => {
// ... existing seed logic ...
    const user = auth.currentUser;
    if (!user) return;
    setIsSeeding(true);

    try {
      // 1. Create 4 Projects
      const projectSeeds = [
        {
          name: "Autonomous Research Bot",
          description: "A specialized swarm for market analysis and deep trend extraction.",
          isGithub: false
        },
        {
          name: "Neural Bridge UX",
          description: "Experimenting with multi-modal feedback loops and human-in-the-loop interfaces.",
          isGithub: false
        },
        {
          name: "agenticos-core",
          description: "Core logic and standard libraries for the AgentiCos ecosystem.",
          isGithub: true,
          githubUrl: "https://github.com/agent-os/core",
          metadata: { owner: "agent-os", branch: "main", stars: 1250 }
        },
        {
          name: "agenticos-ui",
          description: "Shared component library for high-speed agent interface development.",
          isGithub: true,
          githubUrl: "https://github.com/agent-os/ui",
          metadata: { owner: "agent-os", branch: "main", stars: 450 }
        }
      ];

      for (const p of projectSeeds) {
        const projectRef = await addDoc(collection(db, "projects"), {
          name: p.name,
          description: p.description,
          githubUrl: p.githubUrl || null,
          metadata: p.metadata || null,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Add 2 unique agents per project
        const roles: any[] = ['planner', 'executor', 'reviewer', 'optimizer', 'memory'];
        const agentNames = ["Nexus", "Cortex", "Echo", "Aura", "Vanguard", "Catalyst", "Oracle", "Scribe"];
        
        for (let i = 0; i < 2; i++) {
          const nameIdx = Math.floor(Math.random() * agentNames.length);
          const roleIdx = Math.floor(Math.random() * roles.length);
          
          await addDoc(collection(db, "agents"), {
            name: `${agentNames[nameIdx]} [${p.name.split(' ')[0]}]`,
            role: roles[roleIdx],
            instructions: `System instruction for ${agentNames[nameIdx]}. Focus on ${p.description.substring(0, 40)}...`,
            projectId: projectRef.id,
            modelConfig: { model: "gemini-2.0-flash", temperature: 0.7 },
            status: "online",
            createdAt: serverTimestamp(),
          });
        }

        // Add 1 sample task per project
        await addDoc(collection(db, "tasks"), {
          projectId: projectRef.id,
          title: `Initial Setup for ${p.name}`,
          input: `Perform a preliminary analysis on the ${p.name} goals: ${p.description}`,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

      alert("AgentiCos core seeded with 4 projects and 8 agents!");
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Failed to seed data.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure global preferences and provider integrations.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest">AI Quantum Core</h3>
            </div>
            <button 
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Config
            </button>
          </div>
          <div className="p-6 space-y-8">
            {/* Provider Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Neural Engine</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPreferredProvider('gemini')}
                  className={cn(
                    "p-4 rounded-xl border transition-all text-left space-y-1",
                    preferredProvider === 'gemini' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="font-bold flex items-center gap-2">
                    Gemini <div className={cn("w-2 h-2 rounded-full", preferredProvider === 'gemini' ? "bg-primary animate-pulse" : "bg-muted")} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">Standard high-context reliability by Google.</p>
                </button>
                <button 
                  onClick={() => setPreferredProvider('groq')}
                  className={cn(
                    "p-4 rounded-xl border transition-all text-left space-y-1",
                    preferredProvider === 'groq' ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500" : "border-border hover:border-orange-500/50"
                  )}
                >
                  <p className="font-bold flex items-center gap-2">
                    Groq <div className={cn("w-2 h-2 rounded-full", preferredProvider === 'groq' ? "bg-orange-500 animate-pulse" : "bg-muted")} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">Ultra-low latency inference via LPU technology.</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Gemini Config */}
              <div className="space-y-4 pt-4 border-t sm:border-t-0 sm:pt-0 sm:pr-4 sm:border-r border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">G</div>
                  <h4 className="text-xs font-bold uppercase tracking-widest">Gemini Settings</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Model Selection</label>
                  <select 
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-secondary border border-border px-3 py-2 rounded-lg text-xs outline-none focus:border-primary"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Auth managed via AI Studio secrets.</p>
              </div>

              {/* Groq Config */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-xs">Q</div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-orange-500">Groq Settings</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Model Selection</label>
                  <select 
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    className="w-full bg-secondary border border-border px-3 py-2 rounded-lg text-xs outline-none focus:border-orange-500"
                  >
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Custom API Key</label>
                  <input 
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-secondary border border-border px-3 py-2 rounded-lg text-xs outline-none focus:border-orange-500 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Overrides environment key if provided.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GitHub Integration */}
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Connective Tissue</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GitHub Personal Access Token</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-secondary border border-border pl-10 pr-4 py-2 rounded-lg text-xs outline-none focus:border-primary font-mono"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Allows importing and analyzing private repositories.</p>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 bg-secondary/30 border-b border-border flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Data Management</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Seed Demo Data</p>
                <p className="text-sm text-muted-foreground">Populate your workspace with example projects, agents, and tasks.</p>
              </div>
              <button 
                onClick={seedDemoData}
                disabled={isSeeding}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Seeding Agentic Core
              </button>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border">
              <div className="space-y-1">
                <p className="font-medium text-red-500">Danger Zone</p>
                <p className="text-sm text-muted-foreground">Wipe all projects, agents, and execution history.</p>
              </div>
              <button className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Factory Reset
              </button>
            </div>
          </div>
        </section>

        {/* Real World Bridges Section */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 bg-secondary/30 border-b border-border flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Real-World Bridges (Integrations)</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your AgentiCos instance to external tools. Bridges allow agents to "break out" of the sandbox and interact with real services via Webhooks.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/20 border border-border flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tighter opacity-50">Experimental</span>
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <h4 className="font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Custom Webhook Bridge
                  </h4>
                  <p className="text-xs text-muted-foreground">Send finalized copies to Discord, Slack, or a Zapier trigger.</p>
                  <button className="mt-auto px-3 py-1.5 bg-foreground/10 text-xs font-bold rounded-md hover:bg-primary hover:text-primary-foreground transition-all">
                    Register New Bridge
                  </button>
                </div>

                <div className="p-4 rounded-lg bg-secondary/10 border border-border border-dashed opacity-50 flex flex-col items-center justify-center text-center gap-2 cursor-not-allowed">
                  <ShieldCheck className="w-6 h-6" />
                  <p className="text-xs font-bold">SQL Runner (Locked)</p>
                  <p className="text-[10px]">Direct database manipulation requires elevated credentials.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Info */}
        <div className="flex items-center justify-center pt-12 gap-8 grayscale opacity-30">
          <Globe className="w-8 h-8" />
          <ShieldCheck className="w-8 h-8" />
          <SettingsIcon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
