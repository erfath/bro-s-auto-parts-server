const express = require('express')
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.28yeg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const itemCollection = client.db('auto-parts').collection('items');
        const orderCollection = client.db('auto-parts').collection('orders');

        app.get('/item', async (req, res)=>{
            const query = {}
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        })

        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const item = await itemCollection.findOne(query)
            res.send(item);
        });

        app.post('/order', async (req,res)=>{
            const order = req.body;
            const result = await orderCollection.insertOne(order);
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