import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const githubService = {
  async getRepoInfo(repoUrl: string) {
    try {
      // Parse owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error("Invalid GitHub URL format");
      
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, "");
      
      // Get settings for optional token
      const user = auth.currentUser;
      let token = "";
      if (user) {
        try {
          const snap = await getDoc(doc(db, "userSettings", user.uid));
          if (snap.exists()) {
            token = snap.data().githubToken || "";
          }
        } catch (error) {
          console.warn("Failed to fetch user settings for GitHub token, proceeding without token:", error);
          // Don't throw, just proceed without token
        }
      }

      const headers: Record<string, string> = {
        "Accept": "application/vnd.github.v3+json"
      };
      
      if (token) {
        headers["Authorization"] = `token ${token}`;
      }

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch repository info");
      }

      const data = await response.json();
      return {
        name: data.name,
        description: data.description || "",
        tags: data.topics || [],
        stars: data.stargazers_count,
        owner: data.owner.login,
        branch: data.default_branch
      };
    } catch (error: any) {
      console.error("GitHub Fetch Error:", error);
      throw error;
    }
  }
};
