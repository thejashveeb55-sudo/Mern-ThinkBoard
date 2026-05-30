import express from "express"
import {getAllNotes, createNote, UpdateNote, DeleteNote, getNoteByID} from "../Controllers/notesControllers.js";
const router = express.Router();
router.get("/", getAllNotes);
router.get("/:id", getNoteByID);
router.post("/", createNote);
router.put("/:id", UpdateNote);
router.delete("/:id",DeleteNote);
export default router;

 