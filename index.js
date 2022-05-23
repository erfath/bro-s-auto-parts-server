const express = require('express')
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.28yeg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
console.log('connected')
    }

    finally{}
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hey, Can You Hear Me?')
})

app.listen(port, () => {
  console.log(`Car parts owner is listening on port ${port}`)
})