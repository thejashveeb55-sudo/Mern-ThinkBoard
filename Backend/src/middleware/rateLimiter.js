import  rateLimit  from "../config/upstash.js"

const rateLimiter = async (req,res,next) => {
  try{
    const {success} = await rateLimit.limit("my-limit-key");
    if(!success){
      return res.status(429).json({
        message: "Too many requests,pls ty again later"
      });
    }
    next();
  }
  catch(error){
    console.log("Ratelimiter error",error);
    next(error);
  }
}
export default rateLimiter; 
