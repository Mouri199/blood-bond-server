const express = require('express')
require('dotenv').config()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 8000;

app.use(cors())
app.use(express.json())



var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-8pabrgd-shard-00-00.q1kedym.mongodb.net:27017,ac-8pabrgd-shard-00-01.q1kedym.mongodb.net:27017,ac-8pabrgd-shard-00-02.q1kedym.mongodb.net:27017/?ssl=true&replicaSet=atlas-uqgq0w-shard-0&authSource=admin&retryWrites=true&w=majority`;

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
        // 

        const review = client.db('bloodBondDB').collection('reviews')
        const blog = client.db('bloodBondDB').collection('blogs')
        const district = client.db('bloodBondDB').collection('bdDistrict')
        const upozela = client.db('bloodBondDB').collection('upozela')
        const userCollection = client.db('bloodBondDB').collection('users')
        const donorRequ = client.db('bloodBondDB').collection('bloodDonor')
        const createDonor = client.db('bloodBondDB').collection('createDonor')
        const blogPublish = client.db('bloodBondDB').collection('blogPublish')



        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares 
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }
        const verifyVoluenteer = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isVoluenteer = user?.role === 'Voluenteer';
            if (!isVoluenteer) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }



        app.get('/reviews', async (req, res) => {
            const cursor = review.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/district', async (req, res) => {
            const cursor = district.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/upozela', async (req, res) => {
            const cursor = upozela.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/blogPublish', async (req, res) => {
            const cursor = blogPublish.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/bloodDonor', async (req, res) => {
            const cursor = donorRequ.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/recentDonor', async (req, res) => {
            const cursor = createDonor.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/donorrequest', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await createDonor.find(query).toArray()
            res.send(result)
        })


        app.get('/blogs', async (req, res) => {
            const cursor = blog.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // Users........

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/users/voluenteer/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'voluenteer'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.patch('/users/active/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'active'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.patch('/users/blocked/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'blocked'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })



        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })
        app.get('/users/voluenteer/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let voluenteer = false;
            if (user) {
                voluenteer = user?.role === 'voluenteer';
            }
            res.send({ voluenteer });
        })

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            console.log(req.headers);
            const cursor = userCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/profile', async (req, res) => {
            console.log(req.headers);
            const cursor = userCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })


        app.put("/blogsUpdate/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options ={
                upsert:true
            }
            const newData = req.body;
       
            const updateblog = {
                $set: {
                    img: newData.img,
                    title: newData.title,
                    content: newData.content
                },
            };
            const result = await blogPublish.updateOne(filter, updateblog,options);
            res.send(result);
        });


        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        app.delete('/blogPublish/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await blogPublish.deleteOne(query)
            res.send(result)
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });


        app.get('/blogDetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await blog.findOne(query)
            res.send(result);
        })

        app.get('/bloodDonor/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await donorRequ.findOne(query)
            res.send(result);
        })

        app.put('/cancelBloodDonor/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateStatus = {
                $set: {
                    status: 'canceled'
                }
            }
            const result = await donorRequ.updateOne(query, updateStatus)
            res.send(result)
        })
        app.put('/InprogressBloodDonor/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateStatus = {
                $set: {
                    status: 'inprogress'
                }
            }
            const result = await donorRequ.updateOne(query, updateStatus)
            res.send(result)
        })
        app.put('/pendingBloodDonor/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateStatus = {
                $set: {
                    status: 'pending'
                }
            }
            const result = await donorRequ.updateOne(query, updateStatus)
            res.send(result)
        })
        app.put('/doneBloodDonor/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateStatus = {
                $set: {
                    status: 'done'
                }
            }
            const result = await donorRequ.updateOne(query, updateStatus)
            res.send(result)
        })

        app.post('/bloodDonor', async (req, res) => {
            const addDonor = req.body;
            console.log(addDonor);
            const result = await donorRequ.insertOne(addDonor)
            res.send(result)
        })
        app.post('/createDonor', async (req, res) => {
            const addCreateDonor = req.body;
            console.log(addCreateDonor);
            const result = await createDonor.insertOne(addCreateDonor)
            res.send(result)
        })
        app.post('/blogPublish', async (req, res) => {
            const addBlogPublish = req.body;
            console.log(addBlogPublish);
            const result = await blogPublish.insertOne(addBlogPublish)
            res.send(result)
        })
        app.post('/blogs', async (req, res) => {
            const addDonor = req.body;
            console.log(addDonor);
            const result = await blog.insertOne(addDonor)
            res.send(result)
        })

        // payment intent
    //  app.post('/create-payment',async(req,res) =>{
    //     const {price} = req.body;
    //     const amount = parseInt(price*100)

    //     const pamentIntent = await stripe.pamentIntents.create({
    //         amount:amount,
    //         currency: 'usd',
    //         payment_method_types: ['card']
    //     })
    //     res.send({
    //         clientSecret: pamentIntent.client_secret
    //     })
    //  })




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
    res.send('Hello From Blood Bond')
})

app.listen(port, () => {
    console.log(`Blood Bond is running ${port}`);
})