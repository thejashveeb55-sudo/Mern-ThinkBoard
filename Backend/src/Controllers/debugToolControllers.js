// TEMPORARY — for testing agentTools.js directly without needing OpenAI billing.
// Delete this file (and its route) once billing is sorted and the real
// /agent endpoint can be tested end-to-end through the LLM.
import { getCompanySummary, findTasksMatching } from "../services/agentTools.js";

export async function debugSummary(req, res) {
  try {
    const result = await getCompanySummary(req.userId);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Error in debugSummary", error);
    res.status(500).json({ message: error.message });
  }
}

export async function debugFindTasks(req, res) {
  try {
    const { q } = req.query;
    const result = await findTasksMatching(q, req.userId);
    res.status(200).json({ result });
  } catch (error) {
    console.error("Error in debugFindTasks", error);
    res.status(500).json({ message: error.message });
  }
}