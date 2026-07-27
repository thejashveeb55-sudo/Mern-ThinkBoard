import Task from "../models/Task.js";
import { getEmbedding } from "../services/embeddingService.js";

// --- Embedding generation helpers (fire-and-forget, never awaited by callers) ---

async function generateTaskEmbedding(taskId, title, content) {
  try {
    const embedding = await getEmbedding(`${title} ${content}`);
    await Task.findByIdAndUpdate(taskId, {
      task_embedding: embedding,
      task_embedding_status: "completed",
    });
  } catch (error) {
    console.error(`Embedding failed for task ${taskId}:`, error.message);
    await Task.findByIdAndUpdate(taskId, {
      task_embedding_status: "failed",
    }).catch(() => {}); // even the failure-status update could itself fail — don't cascade
  }
}

async function generateCommentEmbedding(taskId, commentId, text) {
  try {
    const embedding = await getEmbedding(text);
    await Task.updateOne(
      { _id: taskId, "comments._id": commentId },
      {
        $set: {
          "comments.$.comment_embedding": embedding,
          "comments.$.comment_embedding_status": "completed",
        },
      }
    );
  } catch (error) {
    console.error(
      `Embedding failed for comment ${commentId} on task ${taskId}:`,
      error.message
    );
    await Task.updateOne(
      { _id: taskId, "comments._id": commentId },
      { $set: { "comments.$.comment_embedding_status": "failed" } }
    ).catch(() => {});
  }
}

// --- Controllers ---

export async function getAllTasks(req, res) {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error in getAllTasks controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getTaskByID(req, res) {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(task);
  } catch (error) {
    console.error("Error in getTaskByID controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteTask(req, res) {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTask controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createTask(req, res) {
  try {
    const { title, content, status, tags } = req.body;
    const newTask = new Task({ title, content, status, tags });
    const savedTask = await newTask.save();

    // Fire-and-forget: NOT awaited, so this doesn't block the response.
    // .catch() safety net already lives inside generateTaskEmbedding itself,
    // but we still guard here in case something throws before that.
    generateTaskEmbedding(savedTask._id, title, content).catch((err) =>
      console.error("Unexpected embedding trigger error:", err)
    );

    res.status(201).json(savedTask);
  } catch (error) {
    console.error("Error in createTask controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateTask(req, res) {
  try {
    const { title, content, status, tags } = req.body;
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const contentChanged =
      title !== existingTask.title || content !== existingTask.content;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { title, content, status, tags },
      { new: true }
    );

    // Only regenerate the embedding if title/content actually changed —
    // a status-only edit shouldn't trigger a re-embed (we reasoned through this earlier).
    if (contentChanged) {
      updatedTask.task_embedding_status = "pending";
      await updatedTask.save();
      generateTaskEmbedding(updatedTask._id, title, content).catch((err) =>
        console.error("Unexpected embedding trigger error:", err)
      );
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error in updateTask controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function addComment(req, res) {
  try {
    const { author, text } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.comments.push({ author, text });
    await task.save();

    const newComment = task.comments[task.comments.length - 1];

    generateCommentEmbedding(task._id, newComment._id, text).catch((err) =>
      console.error("Unexpected embedding trigger error:", err)
    );

    res.status(201).json(task);
  } catch (error) {
    console.error("Error in addComment controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}