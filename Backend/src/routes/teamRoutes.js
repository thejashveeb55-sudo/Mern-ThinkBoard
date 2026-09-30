import express from "express";
import Team from "../models/Team.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

// Creating user becomes owner automatically.
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const team = await Team.create({
      name,
      members: [{ userId: req.userId, role: "owner" }],
    });
    res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Only an existing owner can add members — enforced inline here since it's
// a one-off check, not worth a full requireTeamRole middleware call for one route.
router.post("/:id/members", async (req, res) => {
  try {
    const { userId, role } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const requester = team.members.find((m) => m.userId.toString() === req.userId);
    if (!req.isAdmin && requester?.role !== "owner") {
      return res.status(403).json({ message: "Only an owner can add members" });
    }

    team.members.push({ userId, role });
    await team.save();
    res.status(200).json(team);
  } catch (error) {
    console.error("Error adding team member", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;