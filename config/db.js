require('dotenv').config();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
mongoose.connect("mongodb://localhost:27017/carRegistration", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
