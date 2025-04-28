const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  number: String,
  status: { type: String, enum: ['registered', 'complained'], default: 'registered' },
 complaints: [{
  complaint: String,
  complainedBy: String,
  location: String,
  at: { type: Date, default: Date.now }
}]
}, { _id: false });


const registrationSchema = new mongoose.Schema({
  phone: String,
  name:String,

  vehicles: [vehicleSchema],
  reason: String,
  step: String,
}, { timestamps: true });
module.exports = mongoose.model('Registration', registrationSchema);