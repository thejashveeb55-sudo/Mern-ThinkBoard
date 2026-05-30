import "dotenv/config";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import notesRoutes from "./routes/notesRoutes.js"
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js"
dotenv.config();

//console.log(process.env.MONGO_URI);
const app = express();
const PORT = process.env.PORT || 5002;
const __dirname = path.resolve()

//middleware
if(process.env.NODE_ENV !== "production"){
  app.use(
    cors({
      origin: "http://localhost:5173",
    })
  );
} 
app.use(express.json()); //gives access to req body
app.use(rateLimiter);

//custom middleware fn
app.use((req,res,next) =>{
  console.log(`The req method is ${req.method} and the req URL is ${req.url}`);
  next();
});
app.use("/api/notes", notesRoutes);

if(process.env.NODE_ENV === "production"){
  app.use(express.static(path.join(__dirname,"../Frontend/dist")));

  app.get("*",(req,res) => {
    res.sendFile(path.join(__dirname,"/Frontend","dist","index.html"));
});
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on PORT : ${PORT}`);
  });
});

