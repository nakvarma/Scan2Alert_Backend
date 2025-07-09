require('dotenv').config();

const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://sajidnazirbytecraft:sajidnazirbytecraft@cluster0.snlpv42.mongodb.net/Registration?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
