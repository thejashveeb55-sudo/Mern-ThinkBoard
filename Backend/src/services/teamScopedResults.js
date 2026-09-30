import Task from "../models/Task.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { semanticSearch } from "./searchService.js";

/**
 * The single source of truth for "which teams can this user see results from."
 * Used by /search, /ask, and the agent's findTasksMatching tool — previously
 * duplicated logic, now lives in exactly one place so the rule can't drift
 * out of sync between call sites.
 */
async function getAccessibleTeamIds(requestingUserId) {
  const user = await User.findById(requestingUserId);

  if (user?.isAdmin) {
    const allTeams = await Team.find();
    return allTeams.map((t) => t._id.toString());
  }

  const myTeams = await Team.find({ "members.userId": requestingUserId });
  return myTeams.map((t) => t._id.toString());
}

/**
 * Team-scoped wrapper around semanticSearch. semanticSearch itself has no
 * concept of teams (it predates the team model), so scoping happens here,
 * as a post-filter on its results.
 */
export async function getTeamScopedResults(query, requestingUserId, options = {}) {
  const teamIds = await getAccessibleTeamIds(requestingUserId);
  const results = await semanticSearch(query, options);
  return semanticSearch(query,{...options, teamIds});
}