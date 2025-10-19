const Barcode = require('../models/Barcode');
const BarcodeItem = require('../models/BarcodeItem');

function generateRandomBarcode() {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // capital letters
  const numbers = '23456789'; // digits without 0,1
  const allChars = letters + numbers;

  let code = '';

  while (true) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // ✅ ensure at least 1 letter and 1 number
    if (/[A-Z]/.test(code) && /\d/.test(code)) break;
  }

  return code;
}

// Generate unique barcodes and save them to DB
async function generateUniqueBarcodes(count = 50) {
  const generated = new Set();
  const maxAttempts = count * 30;
  let attempts = 0;

  while (generated.size < count && attempts < maxAttempts) {
    attempts++;
    const code = generateRandomBarcode();

    if (generated.has(code)) continue;

    const exists = await Barcode.findOne({
      barcode: { $regex: `^${code}$`, $options: 'i' }
    }).lean();

    if (!exists) generated.add(code);
  }

  if (generated.size < count) {
    throw new Error(`Could not generate ${count} unique barcodes after ${attempts} attempts.`);
  }

  const barcodes = Array.from(generated).map(b => ({ barcode: b, status: false }));
  const inserted = await Barcode.insertMany(barcodes);
  return inserted;
}

// Controller handler
exports.generateBarcodes = async (req, res) => {
  const count = Math.max(1, Math.min(500, parseInt(req.body.count) || 50));

  try {
    const inserted = await generateUniqueBarcodes(count);
    return res.json({
      success: true,
      insertedCount: inserted.length,
      barcodes: inserted.map(b => b.barcode),
    });
  } catch (error) {
    console.error('Generate Barcodes Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAllBarcodes = async (req, res) => {
  try {
    const barcodes = await BarcodeItem.find().sort({ registeredAt: -1 }); // latest first
    res.status(200).json(barcodes);
  } catch (err) {
    console.error('Error fetching barcodes:', err);
    res.status(500).json({ error: 'Failed to fetch barcodes' });
  }
};
exports.deleteBarcode = async (req, res) => {
  try {
    const { id } = req.params; // barcode _id to delete
    console.log('Delete request for barcode ID:', id);

    // Find which user contains this barcode
    const user = await BarcodeItem.findOne({ 'barcodes._id': id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Barcode not found' });
    }

    // Check how many barcodes the user has
    if (user.barcodes.length > 1) {
      // 🔹 Remove only this barcode from the array
      await BarcodeItem.updateOne(
        { _id: user._id },
        { $pull: { barcodes: { _id: id } } }
      );

      return res.status(200).json({
        success: true,
        message: `Barcode deleted successfully for phone ${user.phone}`,
        deletedType: 'singleBarcode',
      });
    } else {
      // 🔹 If only one barcode, delete the entire document
      await BarcodeItem.deleteOne({ _id: user._id });

      return res.status(200).json({
        success: true,
        message: `User with phone ${user.phone} deleted because only one barcode existed`,
        deletedType: 'user',
      });
    }
  } catch (error) {
    console.error('Error deleting barcode:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
