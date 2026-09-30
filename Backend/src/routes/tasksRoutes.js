import express from "express";
import {
  getAllTasks,
  getTaskByID,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  searchTasks,
  askAI,
  agentChat,
} from "../Controllers/tasksControllers.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireTeamRole } from "../middleware/requireTeamRole.js";
import { resolveTeamFromTask } from "../middleware/resolveTeamFromTask.js";
import { debugSummary, debugFindTasks } from "../Controllers/debugToolControllers.js";

const router = express.Router();

router.use(requireAuth);

// /search and /ask intentionally have NO team-role check — they operate
// across whatever the user can already see. Scoping search/RAG results to
// team membership is a real gap, flagged for later, not solved today.
//before :id because otherwise req.params.id would literally be set to search/ask or agent
router.get("/search", searchTasks);
router.get("/ask", askAI);
router.post("/agent", agentChat); 
router.get("/debug-summary", debugSummary);
router.get("/debug-find", debugFindTasks);

// GET routes: viewer is enough to read
router.get("/", getAllTasks);
router.get("/:id", resolveTeamFromTask, requireTeamRole("viewer"), getTaskByID);

// Mutating routes: collaborator minimum to create/edit, owner to delete
router.post("/", requireTeamRole("collaborator"), createTask);
router.put("/:id", resolveTeamFromTask, requireTeamRole("collaborator"), updateTask);
router.delete("/:id", resolveTeamFromTask, requireTeamRole("owner"), deleteTask);
router.post("/:id/comments", resolveTeamFromTask, requireTeamRole("collaborator"), addComment);

export default router;