import Task from "../models/Task.js";
import { getEmbedding } from "./embeddingService.js";

// Pure math: cosine similarity between two equal-length vectors.
// O(d) where d = vector dimensionality (384 here) — not O(1), as we worked out.
function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Brute-force semantic search across all tasks and comments.
 * Fine at this project's scale (see complexity discussion: O(q * d * n)).
 * Optional statusFilter demonstrates the hybrid search pattern —
 * structured filter (MongoDB query) + semantic filter (cosine similarity),
 * kept separate rather than baked into the embedded text.
 */
export async function semanticSearch(queryText, { statusFilter, topK = 5 } = {}) {
  const queryEmbedding = await getEmbedding(queryText);

  const mongoFilter = { task_embedding_status: "completed" };
  if (statusFilter) mongoFilter.status = statusFilter;

  const tasks = await Task.find(mongoFilter);

  const results = [];

  for (const task of tasks) {
    results.push({
      type: "task",
      taskId: task._id,
      title: task.title,
      score: cosineSimilarity(queryEmbedding, task.task_embedding),
    });

    for (const comment of task.comments) {
      if (comment.comment_embedding_status !== "completed") continue;
      results.push({
        type: "comment",
        taskId: task._id,
        commentId: comment._id,
        text: comment.text,
        score: cosineSimilarity(queryEmbedding, comment.comment_embedding),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}