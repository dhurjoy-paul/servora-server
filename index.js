require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const app = express()
const port = process.env.PORT || 3000

// Middleware
const corsOptions = {
  origin: [
    'https://ph-assignment-11-8fc18.web.app',
    'https://ph-assignment-11-8fc18.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// jwt token verification middleware


// MongoDB Setup
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  const db = client.db('servoraDB')
  const usersCollection = db.collection('users')
  const servicesCollection = db.collection('services')
  const bookingsCollection = db.collection('bookings')

  try {
    // await client.connect();


  } finally {
    // 
  }
}


run().catch(console.dir)

app.get('/', (req, res) => { res.send('Hello from Servora Server..') })
app.listen(port, () => { console.log(`Servora is running on port ${port}`) })
