const mongoose = require('mongoose');

const barcodeSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  status: { type: Boolean, default: false } 
});

module.exports = mongoose.model('Barcode', barcodeSchema);
