const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const barcodeController = require('../controllers/barcodeWebhookController');

router.get('/webhook', webhookController.getWebhook);

router.post('/webhook', async (req, res) => {
  try {
    const messages = req.body.entry[0].changes[0].value.messages;
    const phoneNumberId = req.body.entry[0].changes[0].value.metadata?.phone_number_id;
    if (phoneNumberId === "830078310189900") { 
    //  if (phoneNumberId === "845239642002464") {
     await barcodeController.handleBarcodeWebhook(req, res);
    } else {
      await webhookController.handleWebhook(req, res);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
