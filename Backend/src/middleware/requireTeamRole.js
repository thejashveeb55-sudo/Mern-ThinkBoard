import Team from "../models/Team.js";

/**
 * Factory: returns middleware that requires the requester to have at least
 * `minRole` in the task's team. Role hierarchy: owner > collaborator > viewer.
 * isAdmin users bypass this check entirely.
 *
 * Expects req.userId (set by requireAuth) and req.body.teamId (for create)
 * or req.params.id (for existing tasks — looks up the task's teamId).
 */
const ROLE_RANK = { viewer: 1, collaborator: 2, owner: 3 };

export function requireTeamRole(minRole) {
  return async function (req, res, next) {
    try {
      if (req.isAdmin) return next(); // CEO-style bypass, set by requireAuth

      const teamId = req.body.teamId || req.resolvedTeamId;
      if (!teamId) {
        return res.status(400).json({ message: "teamId is required" });
      }

      const team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });

      const membership = team.members.find(
        (m) => m.userId.toString() === req.userId
      );

      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.teamRole = membership.role;
      next();
    } catch (error) {
      console.error("Error in requireTeamRole middleware", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}