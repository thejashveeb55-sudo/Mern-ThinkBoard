import mongoose from "mongoose"
export const connectDB = async () => {
  try{
    //hi
    console.log(process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MONGODB CONNECTED SUCESSFULLY!");
  } catch(error){
    console.error("Error connecting to mongoDB",error);
    process.exit(1); //Exit with failure
  }
};
//mongodb+srv://thejubabu1_db_user:6zINmEycb1sn5p0y@cluster0.0guzy5n.mongodb.net/?appName=Cluster0