const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.28yeg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbiden Access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const itemCollection = client.db('auto-parts').collection('items');
        const orderCollection = client.db('auto-parts').collection('orders');
        const userCollection = client.db('auto-parts').collection('users');
        const paymentsCollection = client.db('auto-parts').collection('payments');
        const userInfoCollection = client.db('auto-parts').collection('userInfo');
        const commentsCollection = client.db('auto-parts').collection('comments');
        const reviewCollection = client.db('auto-parts').collection('review');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        }

        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const item = req.body;
            const price = item.totalPrice;           
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: "usd",
              payment_method_types: ["card"],
            })
            res.send({ clientSecret: paymentIntent.client_secret })
          })

        app.get('/item', async (req, res) => {
            const query = {}
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
              $set: {
                paid: true,
                transaction: payment.transaction
              }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updateOrder = await orderCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);
          })

        app.post('/item', verifyJWT, verifyAdmin, async (req, res) => {
            const newItem = req.body;
            const result = await itemCollection.insertOne(newItem);
            res.send(result);
        })
        app.delete('/item/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await itemCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await itemCollection.findOne(query)
            res.send(item);
        });

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.delete('/user/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ result, token });

        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const buyerEmail = req.query.buyerEmail;
            const decodedEmail = req.decoded.email;
            if (buyerEmail === decodedEmail) {
                const query = { buyerEmail: buyerEmail };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'Forbiden Access' })
            }
        })

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order)
        })

        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
              $set: {
                paid: true,
                transaction: payment.transaction
              }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updateBooking = await orderCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);
          })

          app.get('/orders', verifyJWT, async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        });

          app.post('/userInfo', verifyJWT, async (req, res)=>{
              const userInfo = req.body;
              console.log(userInfo)
              const result = await userInfoCollection.insertOne(userInfo);
              res.send(result);
          })
          app.post('/comments', verifyJWT, async (req, res)=>{
              const comments = req.body;
              const result = await commentsCollection.insertOne(comments);
              res.send(result);
          })
          app.post('/review', verifyJWT, async (req, res)=>{
              const review = req.body;
              const result = await reviewCollection.insertOne(review);
              res.send(result);
          })
        

    }

    finally { }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hey, Can You Hear Me?')
})

app.listen(port, () => {
    console.log(`Car parts owner is listening on port ${port}`)
})