const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3c2xoyj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollections = client.db('bistroBD').collection('menu');
    const reviewCollections = client.db('bistroBD').collection('reviews');
    const recommendCollections = client.db('bistroBD').collection('recommend');

    app.get('/menu', async(req, res) => {
        const result = await menuCollections.find().toArray();
        res.send(result);
    })

    app.get('/reviews', async(req, res) => {
        const result = await reviewCollections.find().toArray();
        res.send(result);
    })

    app.get('/recommends', async(req, res) => {
        const result = await recommendCollections.find().toArray();
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Bistro Boss Server Running');
})

app.listen(port, () => {
    console.log(`Bistro Boss Server Running Port ${port}`);
})