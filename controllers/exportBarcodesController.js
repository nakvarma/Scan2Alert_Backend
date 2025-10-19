const XLSX = require('xlsx');
const Barcode = require('../models/Barcode');
const fs = require('fs');
const path = require('path');

exports.exportBarcodes = async (req, res) => {
  try {
    // Fetch all barcodes from DB
    const barcodes = await Barcode.find({}, { _id: 0, barcode: 1, status: 1 }).lean();

    if (!barcodes.length) {
      return res.status(404).json({ success: false, message: 'No barcodes found.' });
    }

    // Convert Mongo data to Excel worksheet
    const worksheet = XLSX.utils.json_to_sheet(barcodes);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Barcodes');

    // Define file path
    const filePath = path.join(__dirname, '../exports/barcodes.xlsx');

    // Ensure exports folder exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // Write Excel file
    XLSX.writeFile(workbook, filePath);

    // Send file for download
    res.download(filePath, 'barcodes.xlsx', (err) => {
      if (err) console.error('File Download Error:', err);
      else {
        // Optional: delete file after sending to save disk space
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ success: false, message: 'Failed to export barcodes.' });
  }
};
