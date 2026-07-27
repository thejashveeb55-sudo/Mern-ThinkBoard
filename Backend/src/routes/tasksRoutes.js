import express from "express";
import {
  getAllTasks,
  getTaskByID,
  createTask,
  updateTask,
  deleteTask,
  addComment,
} from "../Controllers/tasksControllers.js";

const router = express.Router();

router.get("/", getAllTasks);
router.get("/:id", getTaskByID);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.post("/:id/comments", addComment);

export default router;