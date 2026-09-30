import Task from "../models/Task.js";

/**
 * For routes like PUT/DELETE /:id where teamId isn't in the request body —
 * looks up the task first and stashes its teamId for requireTeamRole to use.
 */
export async function resolveTeamFromTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    req.resolvedTeamId = task.teamId.toString();
    req.task = task; // avoid a duplicate lookup in the controller
    next();
  } catch (error) {
    console.error("Error in resolveTeamFromTask middleware", error);
    res.status(500).json({ message: "Internal server error" });
  }
}