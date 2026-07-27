import Note from '../models/Note.js'

export async function getAllNotes(req,res){
   try{
      const notes = await Note.find().sort({createdAt: -1}); //newest first
      res.status(200).json(notes);
   } catch(error){
      console.error("Error in getAllNotes controller",error);
      res.status(500).json({message: "Internal server error"});
   }
} 

export async function getNoteByID(req,res){
   try{
      const note = await Note.findById(req.params.id);
      if(!note) return res.status(404).json({message : "Note not found"});
      res.status(200).json({message : "Note fetched successfully" ,note});
   }
   catch(error){
      console.error("Error in getNodeByID controller",error);
      res.status(500).json({message : "Internal server error"});
   }
}

export async function createNote(req,res){
   try{
      const { title, content} = req.body;
      const newNote = new Note({title,content});

      const SavedNote = await newNote.save();
      res.status(201).json(SavedNote);
   }catch(error){
         console.error("Error in createNote controller",error);
         res.status(500).json({message: "Internal server error"});
      }
}
export async function UpdateNote(req, res) {
  try {
    const updates = {};

    if (req.body.title !== undefined) {
      updates.title = req.body.title;
    }

    if (req.body.content !== undefined) {
      updates.content = req.body.content;
    }

    if (req.body.isPinned !== undefined) {
      updates.isPinned = req.body.isPinned;
    }

    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json(updatedNote);

  } catch (error) {
    console.error("Error in updateNote controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
} 

export async function DeleteNote(req,res){
   try{
      await Note.findByIdAndDelete(req.params.id)
      if(!DeleteNote) res.status(404).json({message : "Note not found"});
      res.status(200).json({message : "Note deleted succesfully"});
}
catch(error){
   console.error("Error in deleting note",error);
   res.status(500).json({message : "Internal server error"});
}
} 