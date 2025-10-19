// const mongoose = require('mongoose');

// const barcodeSchema = new mongoose.Schema({
//   barcode: { type: String, required: true, unique: true },
//   itemName: { type: String },
//   phone: { type: String },
//   registeredAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('BarcodeItem', barcodeSchema);
const mongoose = require('mongoose');

const barcodeSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  barcodes: [
    {
      barcode: { type: String, required: true },
      itemName: { type: String },
      registeredAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('BarcodeItem', barcodeSchema);
