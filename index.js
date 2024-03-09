const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


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
    // await client.connect();

    const menuCollections = client.db('bistroBD').collection('menu');
    const cartCollections = client.db('bistroBD').collection('carts');
    const reviewCollections = client.db('bistroBD').collection('reviews');
    const recommendCollections = client.db('bistroBD').collection('recommend');
    const userCollections = client.db('bistroBD').collection('users');
    const paymentCollections = client.db('bistroBD').collection('payments');

    app.get('/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const user = await userCollections.findOne(query);
      const result = { admin: user?.role === 'admin' }
      // console.log(user, result);
      res.send(result);
    })

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      };
      next();
    }

    app.get('/menu', async (req, res) => {
      const result = await menuCollections.find().toArray();
      res.send(result);
    })

    app.post('/menu', verifyJWT, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const result = await menuCollections.insertOne(newItem);
      res.send(result);
    })

    app.delete('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollections.deleteOne(query);
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollections.find().toArray();
      res.send(result);
    })

    app.get('/recommends', async (req, res) => {
      const result = await recommendCollections.find().toArray();
      res.send(result);
    })

    // User Start  
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollections.find().sort({ entryDate: -1 }).toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      user.entryDate = new Date();
      const query = { email: user.email };
      const existUser = await userCollections.findOne(query);
      if (existUser) {
        return res.send({ message: 'User already exist' });
      }
      const result = await userCollections.insertOne(user);
      res.send(result);
    })

    app.patch('/makeAdmin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateUser = {
        $set: { role: "admin" }
      };
      const result = await userCollections.updateOne(query, updateUser);
      res.send(result);
    })
    // User End

    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      // console.log(decodedEmail);
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbbiden Access' });
      }

      const result = await cartCollections.find(query).sort({ entryDate: -1 }).toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      const item = req.body;
      item.entryDate = new Date();
      const result = await cartCollections.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollections.deleteOne(query);
      res.send(result);
    })

    app.post('/create-payment-inten', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      // console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      // console.log(paymentIntent);
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payment', async (req, res) => {
      const payment = req.body;
      payment.entryDate = new Date();
      const insurtResult = await paymentCollections.insertOne(payment);

      const query = { _id: {$in: payment.cartItems.map(id => new ObjectId(id))}};
      const deleteResult = await cartCollections.deleteMany(query);

      res.send({insurtResult, deleteResult});
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