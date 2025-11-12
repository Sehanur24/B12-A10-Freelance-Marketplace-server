require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN || "*", 
        credentials: true,
    })
);
app.use(express.json());

//  MongoDB Connection
const uri = process.env.MONGO_URI;
if (!uri) {
    console.error(" Missing MONGO_URI in .env file");
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

//  Main Server Logic
async function run() {
    try {
        await client.connect();

        const db = client.db(process.env.DB_NAME || "siam-db");
        const jobCollection = db.collection("jobs");
        const acceptedCollection = db.collection("acceptedTasks");

        console.log(" MongoDB connected successfully");






        //  Test MongoDB connection
        await client.db("admin").command({ ping: 1 });
        console.log(" Server connected and running smoothly!");
    } catch (err) {
        console.error(" Server failed to start:", err);
    }
}
run().catch(console.dir);

//  Server listening
app.listen(port, () => console.log(` Server listening on port ${port}`));
