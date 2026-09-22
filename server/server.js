import app from "./app.js";
import dotenv from "dotenv";
import { connectDatabase } from "./src/config/database.js";
dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectDatabase();
        console.log("Database Connected");
        app.listen(PORT, () => {
            console.log(`Developer OS API running on http://localhost:${PORT}`);
        })
    } catch (error) {
        console.log("Failed to start server", error);

        process.exit(1);
    }
}

startServer();
