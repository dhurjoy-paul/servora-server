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
  credentials: true
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// jwt token verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).send({ message: 'Unauthorized: No token' });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Forbidden: Invalid token' });

    req.user = decoded;
    next();
  });
};

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

    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      })
        .send({ success: true })
    })

    // logout route (clears the cookie)
    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      });
      res.status(200).send({ message: 'Logged out successfully' });
    });

    // save or update a user's info in db
    app.post('/user', async (req, res) => {
      const userData = req.body
      userData.created_at = new Date().toISOString()
      userData.last_loggedIn = new Date().toISOString()

      const query = { email: userData?.email }

      const alreadyExists = await usersCollection.findOne(query)
      console.log('User already exists-->', !!alreadyExists)
      if (!!alreadyExists) {
        console.log('Updating user data......')
        const result = await usersCollection.updateOne(query, {
          $set: { last_loggedIn: new Date().toISOString() },
        })
        return res.send(result)
      }

      console.log('Creating user data......')
      const result = await usersCollection.insertOne(userData)
      res.send(result)
    })

    // get all services with condition
    app.get('/services', async (req, res) => {
      const searchText = req.query.search || '';
      const providerEmail = req.query.providerEmail;

      let query = {};

      if (searchText) {
        query.name = { $regex: searchText, $options: 'i' };
      }

      if (providerEmail) {
        query.providerEmail = providerEmail;
      }

      try {
        const result = await servicesCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).send({ message: 'Failed to fetch services' });
      }
    });

    // get one service
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query)
      res.send(result);
    })

    // get 6 random services
    app.get('/services/random/6', async (req, res) => {
      try {
        const pipeline = [{ $sample: { size: 6 } }];
        const result = await servicesCollection.aggregate(pipeline).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching random services:', error);
        res.status(500).send({ message: 'Failed to fetch random services' });
      }
    });

    // post a service
    app.post('/services', verifyToken, async (req, res) => {
      const serviceData = req.body;
      const result = await servicesCollection.insertOne(serviceData);
      res.send(result);
    })

    // update 
    app.patch('/services/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const updates = req.body;

      try {
        const result = await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Service not found or no changes made' });
        }

        res.send({ message: 'Service updated successfully', result });
      } catch (error) {
        console.error('Error patching service:', error);
        res.status(500).send({ message: 'Failed to update service' });
      }
    });

    // delete
    app.delete('/services/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query)
      res.send(result);
    })

    // post a booking
    app.post('/bookings', verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);
      res.send(result);
    })

    // Get all bookings for a specific email
    app.get('/bookings', verifyToken, async (req, res) => {
      try {
        const { providerEmail, userEmail } = req.query;

        const query = providerEmail
          ? { providerEmail }
          : userEmail
            ? { userEmail }
            : {};

        const bookings = await bookingsCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    // Update serviceStatus of a booking
    app.patch('/bookings/:id', verifyToken, async (req, res) => {
      try {
        const bookingId = req.params.id;
        const { serviceStatus } = req.body;

        const result = await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { serviceStatus } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Booking not found or already updated' });
        }

        res.send({ message: 'Status updated successfully', result });
      } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

  } finally {
    // 
  }
}


run().catch(console.dir)

app.get('/', (req, res) => { res.send('Hello from Servora Server..') })
app.listen(port, () => { console.log(`Servora is running on port ${port}`) })
