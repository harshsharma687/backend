import dotenv from "dotenv";
import connectToDatabase from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
    path: "./.env"
});

connectToDatabase()
.then(() => {
    app.listen(process.env.port || 8000, () => {
        console.log(` server is running at port : ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("mongo db connection failed !!!" , error)
})





































// import express from "express";

// const app = express();

// ( async () => {
//     try{
//        await   mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        app.on("error", (error) => {
//            console.error("Error connecting to MongoDB:", error);
//            throw error;
//        });

//        app.listen(process.env.PORT, () => {
//               console.log(`Server is running on port ${process.env.PORT}`);
//        });
       
//     } catch (error){
//        console.log("error : " ,error);
//        throw error;
//     }
// })()