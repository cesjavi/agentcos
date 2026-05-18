import { useState, useMemo } from "react";
import { useFirestoreCollection } from "../hooks/useFirestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Project } from "../types";
import { addDoc, collection, serverTimestamp, where } from "firebase/firestore";
import { Plus, Briefcase, ChevronRight, Calendar, Github, Globe, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { motion } from "motion/react";
import { githubService } from "../services/githubService";
import { agentService } from "../services/agentService";
import { ConfirmationDialog } from "../components/ConfirmationDialog";

export function ProjectList() {
  const user = auth.currentUser;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'github'>('manual');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // Manual Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // GitHub Form
  const [githubUrl, setGithubUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const projectConstraints = useMemo(() => [
    where("ownerId", "==", user?.uid || "anonymous")
  ], [user?.uid]);

  const { data: projects, loading } = useFirestoreCollection<Project>("projects", projectConstraints, {
    enabled: !!user
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !user) return;

    try {
      await addDoc(collection(db, "projects"), {
        name,
        description,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "projects");
    }
  };

  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl || !user) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const repoInfo = await githubService.getRepoInfo(githubUrl);
      
      try {
        await addDoc(collection(db, "projects"), {
          name: repoInfo.name,
          description: repoInfo.description || `Imported from ${repoInfo.owner}/${repoInfo.name}`,
          githubUrl: githubUrl,
          metadata: {
            owner: repoInfo.owner,
            branch: repoInfo.branch,
            stars: repoInfo.stars
          },
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        resetForm();
      } catch (fError) {
        handleFirestoreError(fError, OperationType.WRITE, "projects");
      }
    } catch (error: any) {
      setImportError(error.message || "Failed to import from GitHub");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await agentService.deleteProject(projectToDelete);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setGithubUrl("");
    setImportError(null);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate">Manage your agent collaborative spaces.</p>
        </header>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline ml-2">New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-40 md:h-48 bg-muted rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed border-border rounded-xl space-y-4">
          <Briefcase className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground opacity-50" />
          <div className="text-center">
            <h3 className="font-semibold text-base md:text-lg">No projects found</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Create your first workspace or seed sample projects.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Manual Create
            </button>
            <Link 
              to="/settings"
              className="px-6 py-2 bg-secondary text-foreground rounded-lg font-bold text-sm hover:bg-secondary/70 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Seed Demo Database
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map((project) => (
            <Link 
              key={project.id} 
              to={`/projects/${project.id}`}
              className="group bg-card border border-border p-4 md:p-6 rounded-xl space-y-4 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-black/20"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 md:p-3 bg-secondary rounded-lg group-hover:bg-primary transition-colors">
                  <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  {project.githubUrl && (
                    <div className="p-1.5 bg-zinc-800 text-white rounded-md" title="GitHub Project">
                      <Github className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProjectToDelete(project.id);
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </div>
              </div>
              <div className="space-y-1 md:space-y-2">
                <h3 className="font-bold text-lg md:text-xl truncate">{project.name}</h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              </div>
              <div className="pt-3 md:pt-4 flex items-center justify-between border-t border-border">
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {project.createdAt ? format(project.createdAt.toDate(), 'MMM d, yyyy') : 'Creating...'}
                </div>
                <div className="flex -space-x-1.5 md:-space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[8px] md:text-[10px] font-bold">
                       A{i}
                     </div>
                   ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ConfirmationDialog 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? All associated tasks, agents, and memories will be orphaned or must be deleted separately."
      />

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card w-full max-w-md border-x border-t sm:border border-border rounded-t-3xl sm:rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-6">Create Project</h2>
              
              <div className="flex bg-secondary rounded-xl p-1 mb-6">
                <button 
                  onClick={() => setActiveTab('manual')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === 'manual' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Manual
                </button>
                <button 
                  onClick={() => setActiveTab('github')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === 'github' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </button>
              </div>

              {activeTab === 'manual' ? (
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Project Name</label>
                    <input
                      autoFocus
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors text-sm"
                      placeholder="e.g. Content Engine Alpha"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-secondary border border-border px-4 py-2 rounded-lg outline-none focus:border-primary transition-colors min-h-[100px] text-sm resize-none"
                      placeholder="What is this project's purpose?"
                    />
                  </div>
                  <div className="flex gap-3 pt-4 pb-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-4 py-3 bg-secondary text-foreground hover:bg-secondary/70 rounded-xl font-bold transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold transition-colors text-sm"
                    >
                      Create
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleGithubImport} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Repository URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        autoFocus
                        required
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full bg-secondary border border-border pl-10 pr-4 py-2 rounded-lg outline-none focus:border-primary transition-colors text-sm"
                        placeholder="https://github.com/owner/repo"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">We'll fetch repository details automatically.</p>
                  </div>

                  {importError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-[10px] font-bold">
                      {importError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 pb-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isImporting}
                      className="flex-1 px-4 py-3 bg-secondary text-foreground hover:bg-secondary/70 rounded-xl font-bold transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isImporting}
                      className="flex-1 px-4 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                      {isImporting ? 'Importing...' : 'Import Repo'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
