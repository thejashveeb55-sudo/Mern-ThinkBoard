import Task from "../models/Task.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { semanticSearch } from "./searchService.js";

/**
 * Returns a plain-text summary of company-wide task activity.
 * Authorization happens HERE, using server-verified data — never
 * trusting anything the LLM claims about who's asking.
 */
export async function getCompanySummary(requestingUserId) {
  const user = await User.findById(requestingUserId);

  if (!user?.isAdmin) {
    // Not an admin — scope down to only their own teams instead of
    // refusing outright, since a non-destructive read of your own data
    // is still reasonable even without company-wide access.
    const myTeams = await Team.find({ "members.userId": requestingUserId });
    const teamIds = myTeams.map((t) => t._id);//myTeams is a an array full of team docs. This line maps each team to just t.id
    const tasks = await Task.find({ teamId: { $in: teamIds } });//find every Task whose teamId matches any of the team IDs in teamIds
    return summarize(tasks, "your teams");
  }

  const allTasks = await Task.find(); //no filter at all
  return summarize(allTasks, "the whole company");
} 

function summarize(tasks, scopeLabel) {
  const total = tasks.length;
  const byStatus = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {}); //.reduce() walks through an array and builds up a single accumulated value
  return `Summary for ${scopeLabel}: ${total} total tasks — ${Object.entries(byStatus)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ")}.`; //what?
}

/**
 * Team-scoped semantic search — the tool version of your existing
 * /search endpoint, but restricted to teams the requester actually belongs to
 * (closing the team-scoping gap flagged earlier in RAG/search).
 */
export async function findTasksMatching(query, requestingUserId) {
  const user = await User.findById(requestingUserId);

  let teamIds;
  if (user?.isAdmin) {
    const allTeams = await Team.find();
    teamIds = allTeams.map((t) => t._id.toString());
  } else {
    const myTeams = await Team.find({ "members.userId": requestingUserId });
    teamIds = myTeams.map((t) => t._id.toString());
  }

  const results = await semanticSearch(query, { topK: 5 });

  // semanticSearch doesn't return teamId directly, so look up each
  // matching task's actual teamId before filtering. Not the most
  // efficient (N extra lookups), but correct, and fine at this scale —
  // same complexity-vs-scale reasoning as the brute-force search itself.
  //Semantic search returns response considering access to all teams so we need to do the filtering ourselves. Am i right?
  const scoped = [];
  for (const result of results) {
    const task = await Task.findById(result.taskId).select("teamId");
    if (task?.teamId && teamIds.includes(task.teamId.toString())) {
      scoped.push(result);
    }
  }
  return scoped;
}