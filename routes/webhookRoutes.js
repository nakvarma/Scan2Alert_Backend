// const express = require('express');
// const router = express.Router();
// const webhookController = require('../controllers/webhookController');
// const controller = require('../controllers/barcodeWebhookController');

// router.get('/webhook', webhookController.getWebhook);
//  router.post('/webhook', webhookController.handleWebhook);
// router.post('/webhook', controller.handleBarcodeWebhook);

// module.exports = router;



const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const barcodeController = require('../controllers/barcodeWebhookController');

router.get('/webhook', webhookController.getWebhook);

// ✅ Combine both in one POST route
router.post('/webhook', async (req, res) => {
  try {
    // Example: detect by payload
    const messages = req.body.entry[0].changes[0].value.messages;
    const phoneNumberId = req.body.entry[0].changes[0].value.metadata?.phone_number_id;
    if (phoneNumberId === "830078310189900") {
      // WhatsApp message webhook (Meta Cloud)
     await barcodeController.handleBarcodeWebhook(req, res);
    } else {
      // Some other event (e.g. status updates)
      await webhookController.handleWebhook(req, res);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
