import "dotenv/config";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import tasksRoutes from "./routes/tasksRoutes.js"
import teamRoutes from "./routes/teamRoutes.js"
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js"
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
dotenv.config();

//console.log(process.env.MONGO_URI);
const app = express();
const PORT = process.env.PORT || 5002;
const __dirname = path.resolve()

//middleware
if(process.env.NODE_ENV !== "production"){
  app.use(
    cors({
      origin: "http://52.91.141.40",
      origin: "http://localhost:5173",
    })
  );
} 
app.use(express.json()); //gives access to req body
app.use(rateLimiter);

//auth middleware
app.use(cookieParser());
app.use("/api/auth", authRoutes);

//custom middleware fn
app.use((req,res,next) =>{
  console.log(`The req method is ${req.method} and the req URL is ${req.url}`);
  next();
});
app.use("/api/notes", tasksRoutes);
//RBAC
app.use("/api/teams", teamRoutes);

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

