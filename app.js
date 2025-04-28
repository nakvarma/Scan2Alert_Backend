const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('./config/db');
const registration = require('./routes/registrationRoutes');
const webhookRoutes = require('./routes/webhookRoutes'); 
const cors = require('cors');
const app = express();
const PORT = process.env.PORT ||  3000;

app.use(bodyParser.json());
app.use(cors());
app.use('/', registration);

app.use('/', webhookRoutes);



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});




