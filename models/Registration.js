const mongoose = require('mongoose');

// const vehicleSchema = new mongoose.Schema({
//   number: String,
//   status: { type: String, enum: ['registered', 'complained'], default: 'registered' },
//   dispatchAddress: String,
//   location: String,
//   at: { type: Date, default: Date.now },
//   complaints: [{
//     complaint: String,
//     complainedBy: String,
//     location: String,
//     at: { type: Date, default: Date.now }
//   }]
// },);
const vehicleSchema = new mongoose.Schema({
  number: String,
  status: { type: String, enum: ['registered', 'complained'], default: 'registered' },
  dispatchAddress: String,
  location: String,
  at: { type: Date, default: Date.now },
 
  complaints: [{
    complaint: String,
    complainedBy: String,
     reply: {
    message: String,
    custom: String,
    at: { type: Date, default: Date.now }
  },
    location: String,
    at: { type: Date, default: Date.now }
  }]
});

const registrationSchema = new mongoose.Schema({
  phone: String,
  name: String,

  vehicles: [vehicleSchema],
  reason: String,
  step: String,
}, { timestamps: true });
module.exports = mongoose.model('Registration', registrationSchema);