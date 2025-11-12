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


         //  Home route
        app.get("/", (req, res) => {
            res.send(" Freelance Marketplace Server is Running Smoothly!");
        });


        //  Get all jobs
        app.get("/jobs", async (req, res) => {
            try {
                const jobs = await jobCollection.find().sort({ postedAt: -1 }).toArray();
                res.send(jobs);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch jobs" });
            }
        });

        //  Get single job by ID
        app.get("/jobs/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id))
                    return res.status(400).send({ message: "Invalid Job ID" });
                const job = await jobCollection.findOne({ _id: new ObjectId(id) });
                res.send(job);
            } catch (err) {
                res.status(500).send({ message: "Error fetching job details" });
            }
        });

        //  Add new job
        app.post("/jobs", async (req, res) => {
            try {
                const newJob = req.body;
                if (!newJob.title || !newJob.userEmail)
                    return res.status(400).send({ message: "Missing required fields" });

                newJob.postedAt = new Date();
                const result = await jobCollection.insertOne(newJob);
                res.send({ acknowledged: true, insertedId: result.insertedId });
            } catch (err) {
                res.status(500).send({ message: "Failed to add job" });
            }
        });

        //  Update a job
        app.put("/jobs/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id))
                    return res.status(400).send({ message: "Invalid Job ID" });

                const updatedData = req.body;
                await jobCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedData }
                );
                res.send({ message: "Job updated successfully" });
            } catch (err) {
                res.status(500).send({ message: "Failed to update job" });
            }
        });

        //  Delete a job
        app.delete("/jobs/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id))
                    return res.status(400).send({ message: "Invalid Job ID" });

                await jobCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ message: "Job deleted successfully" });
            } catch (err) {
                res.status(500).send({ message: "Failed to delete job" });
            }
        });

        //  My Added Jobs
        app.get("/myAddedJobs", async (req, res) => {
            try {
                const email = req.query.email;
                if (!email)
                    return res.status(400).send({ message: "Missing email query parameter" });

                const myJobs = await jobCollection.find({ userEmail: email }).toArray();
                res.send(myJobs);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch user jobs" });
            }
        });

        //  Accept a Job
        app.post("/accept-task", async (req, res) => {
            try {
                const { jobId, title, acceptedBy } = req.body;
                if (!ObjectId.isValid(jobId))
                    return res.status(400).send({ message: "Invalid jobId" });

                const job = await jobCollection.findOne({ _id: new ObjectId(jobId) });
                if (!job) return res.status(404).send({ message: "Job not found" });
                if (job.userEmail === acceptedBy)
                    return res
                        .status(403)
                        .send({ message: "You cannot accept your own job" });

                const acceptedJob = {
                    jobId: new ObjectId(jobId),
                    title,
                    acceptedBy,
                    acceptedAt: new Date(),
                    status: "pending",
                };

                const result = await acceptedCollection.insertOne(acceptedJob);
                res.send({ acknowledged: true, insertedId: result.insertedId });
            } catch (err) {
                res.status(500).send({ message: "Failed to accept task" });
            }
        });

        //  Get My Accepted Tasks
        app.get("/my-accepted-tasks", async (req, res) => {
            try {
                const email = req.query.email;
                if (!email)
                    return res.status(400).send({ message: "Missing email query parameter" });

                const tasks = await acceptedCollection.find({ acceptedBy: email }).toArray();
                res.send(tasks);
            } catch (err) {
                res.status(500).send({ message: "Failed to fetch accepted tasks" });
            }
        });

        //  Delete Accepted Task (Done / Cancel)
        app.delete("/my-accepted-tasks/:id", async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id))
                    return res.status(400).send({ message: "Invalid Task ID" });

                await acceptedCollection.deleteOne({ _id: new ObjectId(id) });
                res.send({ message: "Task removed successfully" });
            } catch (err) {
                res.status(500).send({ message: "Failed to remove task" });
            }
        });





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
