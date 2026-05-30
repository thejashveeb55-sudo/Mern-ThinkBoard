import "dotenv/config";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import notesRoutes from "./routes/notesRoutes.js"
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js"
dotenv.config();

//console.log(process.env.MONGO_URI);
const app = express();
const PORT = process.env.PORT || 5002;


//middleware
app.use(
  cors({
  origin: "http://localhost:5173",
})
);
app.use(express.json()); //gives access to req body
app.use(rateLimiter);

//custom middleware fn
app.use((req,res,next) =>{
  console.log(`The req method is ${req.method} and the req URL is ${req.url}`);
  next();
});
app.use("/api/notes", notesRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on PORT : ${PORT}`);
  });
});

