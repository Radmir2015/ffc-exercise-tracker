const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.urlencoded());
app.use(express.json());
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { serverApi: { version: '1', strict: true, deprecationErrors: true } });

// Schemas
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.post('/api/users', async (req, res) => {
  try {
    let newUser = new User({ username: req.body.username });
    newUser = await newUser.save();
    res.json({
      username: newUser.username,
      _id: newUser._id
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});


app.get('/api/users', (req, res) => {
  try {
    const users = new User.find({});
    
    res.json(users.map(user => ({
      username: user.username,
      _id: user._id
    })));
  } catch (error) {
    res.status(500).send('Server error');
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;
    
    let newExercise = new Exercise({
      userId,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });

    newExercise = await newExercise.save();
    
    // Populate the username from User model
    const user = await User.findById(userId);
    
    res.json({
      _id: userId,
      username: user.username,
      date: newExercise.date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description
    });
  } catch (error) {
    console.error(error)
    res.status(500).send('Server error');
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const userId = req.params._id;
    let query = Exercise.find({ userId });

    // Handle date range filtering
    if (from) {
      query = query.where('date').gte(new Date(from));
    }
    if (to) {
      query = query.where('date').lte(new Date(to));
    }
    if (limit) {
      query = query.limit(Number(limit));
    }

    const exercises = await query.exec();
    const user = await User.findById(userId);

    res.json({
      _id: userId,
      username: user.username,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }))
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
