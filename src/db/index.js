import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

import dns from "dns"

dns.setServers([
    '1.1.1.1' , '8.8.8.1'
])

const connectToDatabase = async () => {
    try {
    
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(
            `Connected to MongoDB successfully !! ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.log("Error connecting to MongoDB:",  error);
        process.exit(1);
    }
};

export default connectToDatabase