const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.get('/webhook', webhookController.getWebhook);
router.post('/webhook', webhookController.handleWebhook);

module.exports = router;



