const axios = require('axios');
const Registration = require('../models/Registration');

const token =process.env.WHATSAPP_TOKEN;

function sendMessage(phone, text, buttons = []) {
  const data = {
    messaging_product: 'whatsapp',
    to: phone,
    type: buttons.length ? 'interactive' : 'text',
    ...(buttons.length
      ? {
          interactive: {
            type: 'button',
            body: { text },
            action: {
              buttons: buttons.map((b, i) => ({
                type: 'reply',
                reply: { id: `btn_${i}`, title: b },
              })),
            },
          },
        }
      : { text: { body: text } }),
  };

  return axios.post(
    'https://graph.facebook.com/v22.0/595249923680121/messages',
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

function extractText(msg) {
  if (msg.type === 'text') return msg.text.body.toLowerCase();
  if (
    msg.type === 'interactive' &&
    msg.interactive.type === 'button_reply'
  ) {
    return msg.interactive.button_reply.title.toLowerCase();
  }
  return '';
}
async function reverseGeocode(latitude, longitude) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

  try {
    const res = await axios.get(url);
    const results = res.data.results;
    if (results && results.length > 0) {
      return results[0].formatted_address;
    }
    return `Lat: ${latitude}, Long: ${longitude}`;
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return `Lat: ${latitude}, Long: ${longitude}`; // fallback
  }
}

const tempComplaints = {};
const COMPLAINT_REASONS = ['Wrong parking', 'Obstructing road', 'Other'];

exports.handleWebhook = async (req, res) => {
  const entry = req.body.entry?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  const phone = message.from;

  // ✅ Handle location message
  if (message.type === 'location') {
    const { latitude, longitude, name, address } = message.location;
    // const locationText = `${name || address} (Lat: ${latitude}, Long: ${longitude})`;
const locationText = await reverseGeocode(latitude, longitude);

    const session = tempComplaints[phone];
    if (session?.stage === 'awaiting_location') {
      if (session.isRegistering) {
        const { name: userName, vehicle } = session;
        await Registration.findOneAndUpdate(
          { phone },
          {
            $set: { name: userName },
            $push: {
              vehicles: {
                number: vehicle,
                location: locationText,
                complaints: [],
              },
            },
          },
          { upsert: true }
        );

        delete tempComplaints[phone];
        await sendMessage(
          phone,
          `✅ Thank you. Your vehicle ${vehicle}  is successfully registered with us.Your data is safe with us.`
        );
      } else {
        await saveComplaint(
          phone,
          session.vehicleNumber,
          session.reason,
          locationText
        );
      }
      return res.sendStatus(200);
    }
  }

  const text = extractText(message).trim();

  if (text === 'hi') {
    delete tempComplaints[phone];

    await sendMessage(
      phone,
      `Welcome to Vehicle Alert! 🚗\nThank you for choosing us.\nYour data will remain confidential and secure.\n\nWhat would you like to do?`
    );
    await sendMessage(phone, 'Choose option:', ['Register', 'Complain']);
    return res.sendStatus(200);
  }

  if (text === 'register') {
    await sendMessage(phone, 'Please enter your name:');
    tempComplaints[phone] = {
      stage: 'awaiting_name',
      isRegistering: true,
    };
    return res.sendStatus(200);
  }

  if (
    tempComplaints[phone]?.stage === 'awaiting_name' &&
    tempComplaints[phone]?.isRegistering
  ) {
    if (!text || text.length < 2) {
      await sendMessage(
        phone,
        'Please enter a valid name (at least 2 characters)'
      );
      return res.sendStatus(200);
    }

    tempComplaints[phone].name = text;
    tempComplaints[phone].stage = 'awaiting_vehicle';
    await sendMessage(phone, 'Please enter your vehicle No:');
    return res.sendStatus(200);
  }

  if (
    tempComplaints[phone]?.stage === 'awaiting_vehicle' &&
    tempComplaints[phone]?.isRegistering
  ) {
    if (!text || text.length < 3) {
      await sendMessage(phone, 'Please enter a valid vehicle number.');
      return res.sendStatus(200);
    }

    const vehicleExists = await Registration.exists({
      'vehicles.number': text,
    });

    if (vehicleExists) {
      await sendMessage(
        phone,
        `❌ Vehicle number ${text} is already registered. Please use a different number.`
      );
      return res.sendStatus(200);
    }

    const userHasVehicle = await Registration.exists({
      phone,
      'vehicles.number': text,
    });

    if (userHasVehicle) {
      await sendMessage(
        phone,
        `ℹ️ You've already registered vehicle ${text}.`
      );
      delete tempComplaints[phone];
      return res.sendStatus(200);
    }

    tempComplaints[phone].vehicle = text;
    tempComplaints[phone].stage = 'awaiting_location';
    await sendMessage(
      phone,
      '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
    );


    return res.sendStatus(200);
  }

  if (text === 'complain') {
    await sendMessage(
      phone,
      'Please enter the Vehicle no for which you want to raise complaint:'
    );
    tempComplaints[phone] = { stage: 'awaiting_vehicle' };
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_vehicle') {
    const vehicleExists = await Registration.exists({
      'vehicles.number': text,
    });

    if (vehicleExists) {
      tempComplaints[phone] = {
        stage: 'awaiting_reason',
        vehicleNumber: text,
      };
      await sendMessage(
        phone,
        'What is the issue you are facing:',
        COMPLAINT_REASONS
      );
    } else {
      await sendMessage(
        phone,
        '❌ Vehicle not found. Try again or send "Hi"'
      );
    }
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_reason') {
    const isOtherOption = text === 'other';

    if (isOtherOption) {
      tempComplaints[phone].stage = 'awaiting_custom_reason';
      await sendMessage(phone, 'Please describe the issue:');
    } else {
      tempComplaints[phone].reason = text;
      tempComplaints[phone].stage = 'awaiting_location';
      await sendMessage(
        phone,
        '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
      );
    }
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_custom_reason') {
    tempComplaints[phone].reason = text;
    tempComplaints[phone].stage = 'awaiting_location';
    await sendMessage(
      phone,
      '📍 Please *share* the location using the 📎 icon.'
    );
    return res.sendStatus(200);
  }

  await sendMessage(phone, 'Please send "Hi" to start');
  return res.sendStatus(200);
};

async function saveComplaint(phone, vehicleNumber, reason, locationText) {
  await Registration.updateOne(
    { 'vehicles.number': vehicleNumber },
    {
      $set: { 'vehicles.$.status': 'complained' },
      $push: {
        'vehicles.$.complaints': {
          complaint: reason,
          complainedBy: phone,
          location: locationText,
        },
      },
    }
  );

  const owner = await Registration.findOne({
    'vehicles.number': vehicleNumber,
  });

  if (owner) {
    await sendMessage(
      owner.phone,
      `🚨 Complaint for vehicle ${vehicleNumber}:\n` +
        `Reason: ${reason}\n` +
        `Location: ${locationText}`
    );
  }

  delete tempComplaints[phone];
  await sendMessage(
    phone,
    '✅ Have forwarded the details to the vehicle owner, will forward the reply the car owner shares with us.'
  );
}

exports.getWebhook = (req, res) => {
  const VERIFY_TOKEN = 'myWebhookSecret1234';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  console.log(mode, token, challenge);

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};














