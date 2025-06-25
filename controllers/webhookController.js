
// const axios = require('axios');
// const Registration = require('../models/Registration');

// // const token = "EAAIAjTZBZCCWoBOyzjj9z5KKtTALVZATqmfZBIRfrz2m83njMG8xZA7FZCcrZAf20EZAxpwrzlMHwPrlcU9xFpJZCb6FCnEqrq0ryyZCaIoDmmxOzyKJNVUxtkM5LSKzZCiI7T1vjzFTcGWvLZCnRKq2ZB1Ks8ot5ZBmD37GTu9uFoExxFXNNFuRzbulZBYTpfDp4mYWlYwPp7C25UWxqZBN60IbjTKwqWNzrPe53rp5ZAq3x5GZCOLT0GkZBcZD"
// const token=process.env.WHATSAPP_TOKEN;
// function sendMessage(phone, text, buttons = []) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: buttons.length ? 'interactive' : 'text',
//     ...(buttons.length
//       ? {
//           interactive: {
//             type: 'button',
//             body: { text },
//             action: {
//               buttons: buttons.map((b, i) => ({
//                 type: 'reply',
//                 reply: { id: `btn_${i}`, title: b },
//               })),
//             },
//           },
//         }
//       : { text: { body: text } }),
//   };

//   return axios.post(
//     process.env.WHATSAPP_API_URL,
//     data,
//     {
//       headers: { Authorization: `Bearer ${token}` },
//     }
//   );
// }

// function extractText(msg) {
//   if (msg.type === 'text') return msg.text.body.toLowerCase();
//   if (
//     msg.type === 'interactive' &&
//     msg.interactive.type === 'button_reply'
//   ) {
//     return msg.interactive.button_reply.title.toLowerCase();
//   }
//   return '';
// }

// async function reverseGeocode(latitude, longitude) {
//   const apiKey = process.env.GOOGLE_MAPS_API_KEY;
//   const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

//   try {
//     const res = await axios.get(url);
//     const results = res.data.results;
//     if (results && results.length > 0) {
//       return results[0].formatted_address;
//     }
//     return `Lat: ${latitude}, Long: ${longitude}`;
//   } catch (err) {
//     console.error('Geocoding error:', err.message);
//     return `Lat: ${latitude}, Long: ${longitude}`;
//   }
// }

// const tempComplaints = {};
// const COMPLAINT_REASONS = ['Wrong parking', 'Obstructing road', 'Other'];

// exports.handleWebhook = async (req, res) => {
//   const entry = req.body.entry?.[0];
//   const message = entry?.changes?.[0]?.value?.messages?.[0];
//   if (!message) return res.sendStatus(200);

//   // const phone = message.from;
//   const phone = message.from.replace(/\D/g, '').replace(/^0/, '92').trim();


//   if (tempComplaints[phone]?.stage === 'awaiting_owner_response') {
//     const response = extractText(message).trim();
//     const complainantPhone = tempComplaints[phone].originalComplainant;


//     if (complainantPhone) {
//       await sendMessage(
//         complainantPhone,
//         `📩 The vehicle owner responded:\n"${response}"`
//       );
//     }

//     delete tempComplaints[phone];
//     return res.sendStatus(200);
//   }

//   if (message.type === 'location') {
//     const { latitude, longitude } = message.location;
//     const locationText = await reverseGeocode(latitude, longitude);

//     const session = tempComplaints[phone];
//     if (session?.stage === 'awaiting_location') {
//       if (session.isRegistering) {
//         const { name: userName, vehicle } = session;
//         await Registration.findOneAndUpdate(
//           { phone },
//           {
//             $set: { name: userName },
//             $push: {
//               vehicles: {
//                 number: vehicle,
//                 location: locationText,
//                 complaints: [],
//               },
//             },
//           },
//           { upsert: true }
//         );

//         delete tempComplaints[phone];
//         await sendMessage(
//           phone,
//           `✅ Thank you. Your vehicle ${vehicle} is successfully registered with us. Your data is safe with us.`
//         );
//       } else {
//         await saveComplaint(
//           phone,
//           session.vehicleNumber,
//           session.reason,
//           locationText
//         );
//       }
//       return res.sendStatus(200);
//     }
//   }

//   const text = extractText(message).trim();

//   if (text === 'hi') {
//     delete tempComplaints[phone];

//     await sendMessage(
//       phone,
//       `Welcome to Vehicle Alert! 🚗\nThank you for choosing us.\nYour data will remain confidential and secure.\n\nWhat would you like to do?`
//     );
//     await sendMessage(phone, 'Choose option:', ['Register', 'Complain']);
//     return res.sendStatus(200);
//   }

//   if (text === 'register') {
//     await sendMessage(phone, 'Please enter your name:');
//     tempComplaints[phone] = {
//       stage: 'awaiting_name',
//       isRegistering: true,
//     };
//     return res.sendStatus(200);
//   }

//   if (
//     tempComplaints[phone]?.stage === 'awaiting_name' &&
//     tempComplaints[phone]?.isRegistering
//   ) {
//     if (!text || text.length < 2) {
//       await sendMessage(
//         phone,
//         'Please enter a valid name (at least 2 characters)'
//       );
//       return res.sendStatus(200);
//     }

//     tempComplaints[phone].name = text;
//     tempComplaints[phone].stage = 'awaiting_vehicle';
//     await sendMessage(phone, 'Please enter your vehicle No:');
//     return res.sendStatus(200);
//   }

//   if (
//     tempComplaints[phone]?.stage === 'awaiting_vehicle' &&
//     tempComplaints[phone]?.isRegistering
//   ) {
//     if (!text || text.length < 3) {
//       await sendMessage(phone, 'Please enter a valid vehicle number.');
//       return res.sendStatus(200);
//     }

//     const vehicleExists = await Registration.exists({
//       'vehicles.number': text,
//     });

//     if (vehicleExists) {
//       await sendMessage(
//         phone,
//         `❌ Vehicle number ${text} is already registered. Please use a different number.`
//       );
//       return res.sendStatus(200);
//     }

//     tempComplaints[phone].vehicle = text;
//     tempComplaints[phone].stage = 'awaiting_location';
//     await sendMessage(
//       phone,
//       '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
//     );
//     return res.sendStatus(200);
//   }

//   if (text === 'complain') {
//     await sendMessage(
//       phone,
//       'Please enter the Vehicle no for which you want to raise complaint:'
//     );
//     tempComplaints[phone] = { stage: 'awaiting_vehicle' };
//     return res.sendStatus(200);
//   }

//   if (tempComplaints[phone]?.stage === 'awaiting_vehicle') {
//     const vehicleExists = await Registration.exists({
//       'vehicles.number': text,
//     });

//     if (vehicleExists) {
//       tempComplaints[phone] = {
//         stage: 'awaiting_reason',
//         vehicleNumber: text,
//       };
//       await sendMessage(
//         phone,
//         'What is the issue you are facing:',
//         COMPLAINT_REASONS
//       );
//     } else {
//       await sendMessage(
//         phone,
//         '❌ Vehicle not found. Try again or send "Hi"'
//       );
//     }
//     return res.sendStatus(200);
//   }

//   if (tempComplaints[phone]?.stage === 'awaiting_reason') {
//     const isOtherOption = text === 'other';
//     if (isOtherOption) {
//       tempComplaints[phone].stage = 'awaiting_custom_reason';
//       await sendMessage(phone, 'Please describe the issue:');
//     } else {
//       tempComplaints[phone].reason = text;
//       tempComplaints[phone].stage = 'awaiting_location';
//       await sendMessage(
//         phone,
//         '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
//       );
//     }
//     return res.sendStatus(200);
//   }

//   if (tempComplaints[phone]?.stage === 'awaiting_custom_reason') {
//     tempComplaints[phone].reason = text;
//     tempComplaints[phone].stage = 'awaiting_location';
//     await sendMessage(
//       phone,
//       '📍 Please *share* the location using the 📎 icon.'
//     );
//     return res.sendStatus(200);
//   }

//   await sendMessage(phone, 'Please send "Hi" to start');
//   return res.sendStatus(200);
// };

// // async function saveComplaint(phone, vehicleNumber, reason, locationText) {
// //   await Registration.updateOne(
// //     { 'vehicles.number': vehicleNumber },
// //     {
// //       $set: { 'vehicles.$.status': 'complained' },
// //       $push: {
// //         'vehicles.$.complaints': {
// //           complaint: reason,
// //           complainedBy: phone,
// //           location: locationText,
// //         },
// //       },
// //     }
// //   );

// //   const owner = await Registration.findOne({
// //     'vehicles.number': vehicleNumber,
// //   });

// //   if (owner) {
// //     await sendMessage(
// //       owner.phone,
// //       `🚨 Complaint for vehicle ${vehicleNumber}:\n` +
// //         `Reason: ${reason}\n` +
// //         `Location: ${locationText}\n\nPlease respond:`,
// // [
// //     'Move in 10 min',
// //     'On call, wait',
// //     'Moving now'
// //   ]
// //     );

// //     // Save complainant's info to route response back
// //     tempComplaints[owner.phone] = {
// //       stage: 'awaiting_owner_response',
// //       originalComplainant: phone,
// //     };
// //   }

// //   delete tempComplaints[phone];
// //   await sendMessage(
// //     phone,
// //     '✅ We have forwarded your complaint to the vehicle owner. We’ll let you know once they respond.'
// //   );
// // }
// async function saveComplaint(phone, vehicleNumber, reason, locationText) {
//   await Registration.updateOne(
//     { 'vehicles.number': vehicleNumber },
//     {
//       $set: { 'vehicles.$.status': 'complained' },
//       $push: {
//         'vehicles.$.complaints': {
//           complaint: reason,
//           complainedBy: phone,
//           location: locationText,
//         },
//       },
//     }
//   );

//   const owner = await Registration.findOne({
//     'vehicles.number': vehicleNumber,
//   });

//   if (owner) {
//     // ✅ Normalize owner's phone to 92xxxxxxxxxx format
//     let rawPhone = owner.phone;
//     if (!rawPhone.startsWith('92')) {
//       rawPhone = rawPhone.replace(/^0/, '92'); // Convert 03xx to 92xx
//     }
//     const normalizedOwnerPhone = rawPhone.replace(/\D/g, '').trim();

//     // ✅ Store temp session with normalized phone
//     tempComplaints[normalizedOwnerPhone] = {
//       stage: 'awaiting_owner_response',
//       originalComplainant: phone,
//     };


//     await sendMessage(
//       normalizedOwnerPhone,
//       `🚨 Complaint for vehicle ${vehicleNumber}:\n` +
//         `Reason: ${reason}\n` +
//         `Location: ${locationText}\n\nPlease respond:`,
//       ['Move in 10 min', 'On call, wait', 'Moving now']
//     );
//   }

//   delete tempComplaints[phone];

//   await sendMessage(
//     phone,
//     '✅ We have forwarded your complaint to the vehicle owner. We’ll let you know once they respond.'
//   );
// }

// exports.getWebhook = (req, res) => {
//   const VERIFY_TOKEN = 'myWebhookSecret1234';
//   const mode = req.query['hub.mode'];
//   const token = req.query['hub.verify_token'];
//   const challenge = req.query['hub.challenge'];

//   if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
//     res.status(200).send(challenge);
//   } else {
//     res.sendStatus(403);
//   }
// };


require('dotenv').config();
const axios = require('axios');
const Registration = require('../models/Registration');

//  const token = "EAAIAjTZBZCCWoBO2xiygYGqA4eWcbgeZBC2qDMHcxB7mP0iwsmcqAv8DD99KvEbhK0mwCmY2QrnO1P4BaqTrZCGvIgTv3MNYoL9HpK5fUXZCXflM60ZBkJvgTpPN0Nti2UTi66Dje5N4giIZAEzdEvznd3jBG8RZBtYZAnZCRnQ7mK0YvZC2cSVt1PAZBkTqt89ZCdW7ZArWwOtZAdavJOzdGVNFZA5qNQX1bZBu6uPKUMTKCS0V5pkHiLLEVRTYFn3E5hwZDZD"
 const token = process.env.WHATSAPP_TOKEN;

// function sendMessage(phone, text, buttons = []) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: buttons.length ? 'interactive' : 'text',
//     ...(buttons.length
//       ? {
//         interactive: {
//           type: 'button',
//           body: { text },
//           action: {
//             buttons: buttons.map((b, i) => ({
//               type: 'reply',
//               reply: { id: `btn_${i}`, title: b },
//             })),
//           },
//         },
//       }
//       : { text: { body: text } }),
//   };

//   return axios.post(
//    "https://graph.facebook.com/v23.0/669530022912116/messages",
//     data,
//     {
//       headers: { Authorization: `Bearer ${token}` },
//     }
//   );
// }
function sendMessage(phone, text, options = []) {
  const isList = options.length > 3;

  const data = {
    messaging_product: 'whatsapp',
    to: phone,
    type: options.length ? 'interactive' : 'text',
    ...(options.length
      ? isList
        ? {
            interactive: {
              type: 'list',
              body: { text: text.slice(0, 1024) },
              action: {
                button: 'Choose Option',
                sections: [
                  {
                    title: 'Complaint Reasons',
                    rows: options.map((opt, i) => ({
                      id: `opt_${i}`,
                      title: opt.title.slice(0, 24),
                      description: opt.description?.slice(0, 72) || '',
                    })),
                  },
                ],
              },
            },
          }
        : {
            interactive: {
              type: 'button',
              body: { text },
              action: {
                buttons: options.slice(0, 3).map((b, i) => ({
                  type: 'reply',
                  reply: {
                    id: `btn_${i}`,
                    title: typeof b === 'string' ? b : b.title,
                  },
                })),
              },
            },
          }
      : { text: { body: text } }),
  };

  return axios.post(
    process.env.WHATSAPP_API_URL,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// async function sendMessage(phone, text, options = []) {
//   const isList = options.length > 3;
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//   };

//   if (options.length) {
//     data.type = 'interactive';

//     if (isList) {
//       data.interactive = {
//         type: 'list',
//         body: { text: text.slice(0, 1024).replace(/\n+/g, ' ') }, // sanitize body
//         action: {
//           button: 'Choose', // must be ≤20 chars
//           sections: [
//             {
//               title: 'Options',
//               // rows: options.map((opt, i) => ({
//               //   id: `opt_${i}`,
//               //   title: opt.slice(0, 72), // limit title length
//               // }))
//               // 
//             rows: options.map((opt, i) => ({
//   id: `opt_${i}`,
//   title: opt.title.slice(0, 24),
//   description: opt.description?.slice(0, 72) || ''
// }))
// ,
//             },
//           ],
//         },
//       };
//     } else {
//       data.interactive = {
//         type: 'button',
//         body: { text },
//         action: {
//           buttons: options.slice(0, 3).map((b, i) => ({
//             type: 'reply',
//             reply: {
//               id: `btn_${i}`,
//               title: b.slice(0, 20),
//             },
//           })),
//         },
//       };
//     }
//   } else {
//     data.type = 'text';
//     data.text = { body: text };
//   }

//   try {
//     const response = await axios.post(
//       'https://graph.facebook.com/v23.0/669530022912116/messages',
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );
//     return response;
//   } catch (err) {
//     console.error('❌ WhatsApp API Error:', JSON.stringify(err.response?.data, null, 2));
//   }
// }

async function sendLocationRequest(phone) {
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: {
        text: `📍 Let's continue your registration.\nYou can *share your location* or type it manually.`
      },
      action: {
        name: 'send_location'
      }
    }
  };

  try {
    await axios.post(
      process.env.WHATSAPP_API_URL, // replace with your Phone Number ID
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('❌ Location Request API Error:', err.response?.data || err.message);
  }
}

function extractText(msg) {
  if (msg.type === 'text') return msg.text.body.toLowerCase();

  if (msg.type === 'interactive') {
    if (msg.interactive.type === 'button_reply') {
      return msg.interactive.button_reply.title.toLowerCase();
    }
    if (msg.interactive.type === 'list_reply') {
      return msg.interactive.list_reply.title.toLowerCase();
    }
  }

  return '';
}


// function extractText(msg) {
//   if (msg.type === 'text') return msg.text.body.toLowerCase();
//   if (
//     msg.type === 'interactive' &&
//     msg.interactive.type === 'button_reply'
//   ) {
//     return msg.interactive.button_reply.title.toLowerCase();
//   }
//   return '';
// }

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
    return `Lat: ${latitude}, Long: ${longitude}`;
  }
}

const tempComplaints = {};
// const COMPLAINT_REASONS = ['Wrongly parked', 'Obstructing road', 'Other'];
// const COMPLAINT_REASONS = [ 'Wrong Vehicle Parking',
//   'Obstructing road',
//   'No sticker',
//   'Dangerous parking',
//   'Other'];

const COMPLAINT_REASONS = [
  { title: '❗ Wrong Vehicle Parking', description: 'Your Vehicle Wrongly parked' },
  { title: 'Blocking road', description: 'Your Vehicle jamming the Road' },
  { title: 'Lights/Siren/Unlocked', description: 'Lights turned on/ vehicle unlocked/siren going on' },
  { title: 'Challan Issued', description: 'Generating a challan' },
  {title:'Towing in Progress', description:'Towing vehicle, move immediately'},
  { title: 'Other', description: 'Specify your own reason' }
];
const OWNER_RESPONSE_OPTIONS = [
  {
    title: 'Move in 5–10 mins',
    description: 'Will move my vehicle in 5–10 minutes.'
  },
  {
    title: 'On call, wait',
    description: 'I am held up, will move my vehicle in 15–20 minutes.'
  },
  {
    title: 'Unavailable now',
    description: 'I am unavailable now. Sorry for the inconvenience.'
  },
  {
    title: 'Delegate moving',
    description: 'I have informed someone else to move the vehicle.'
  },
  {
    title: 'Spam/Prank',
    description: 'This complaint seems to be spam or a prank.'
  }
];


exports.handleWebhook = async (req, res) => {
  const entry = req.body.entry?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  // const phone = message.from;
  const phone = message.from.replace(/\D/g, '').replace(/^0/, '92').trim();


  if (tempComplaints[phone]?.stage === 'awaiting_owner_response') {
    const response = extractText(message).trim();
    const complainantPhone = tempComplaints[phone].originalComplainant;


    if (complainantPhone) {
      await sendMessage(
        complainantPhone,
        `📩 The vehicle owner responded:\n"${response}"`
      );
    }

    delete tempComplaints[phone];
    return res.sendStatus(200);
  }

  // if (message.type === 'location') {
  //   const { latitude, longitude } = message.location;
  //   const locationText = await reverseGeocode(latitude, longitude);

  //   const session = tempComplaints[phone];
  //   if (session?.stage === 'awaiting_location') {
  //     if (session.isRegistering) {
  //       const { name: userName, vehicle } = session;
  //       await Registration.findOneAndUpdate(
  //         { phone },
  //         {
  //           $set: { name: userName },
  //           $push: {
  //             vehicles: {
  //               number: vehicle,
  //               location: locationText,
  //               complaints: [],
  //             },
  //           },
  //         },
  //         { upsert: true }
  //       );

  //       delete tempComplaints[phone];
  //       await sendMessage(
  //         phone,
  //         `✅ Thank you. Your vehicle ${vehicle} is successfully registered with us. Your data is safe with us.`
  //       );
  //     } else {
  //       await saveComplaint(
  //         phone,
  //         session.vehicleNumber,
  //         session.reason,
  //         locationText
  //       );
  //     }
  //     return res.sendStatus(200);
  //   }
  // }

  if (tempComplaints[phone]?.stage === 'awaiting_location') {
    const session = tempComplaints[phone];
    let locationText = '';

    if (message.type === 'location') {
      const { latitude, longitude } = message.location;
      locationText = await reverseGeocode(latitude, longitude);
    } else if (message.type === 'text') {
      const zip = message.text?.body?.trim();
      if (!zip || !/^\d{4,8}$/.test(zip)) {
        await sendMessage(
          phone,
          '❌ Please enter a valid ZIP code (4-8 digits) or share your location.'
        );
        return res.sendStatus(200);
      }
      locationText = `ZIP Code: ${zip}`;
    } else {
      await sendMessage(
        phone,
        '📍 Please either *share your location* or *type your ZIP code*.'
      );
      return res.sendStatus(200);
    }

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
              dispatchAddress: "",
              complaints: [],
            },
          },
        },
        { upsert: true }
      );

      delete tempComplaints[phone];
      await sendMessage(
        phone,
        `✅ Thank you. Your vehicle ${vehicle} is successfully registered with us.\n📍 Location: ${locationText}`
      );

      tempComplaints[phone] = {
        stage: 'awaiting_sticker_response',
        vehicle: vehicle,
      };

      await sendMessage(
        phone,
        'Do you have a SCAN2ALERT sticker with you?',
        ['Yes', 'No']
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

  if (tempComplaints[phone]?.stage === 'awaiting_sticker_response') {
    
    if (text === 'yes') {
      await sendMessage(
        phone,
        '✅ Please affix the label at the rear window of your vehicle. Happy driving!'
      );
      delete tempComplaints[phone];
    } else if (text === 'no') {
      tempComplaints[phone].stage = 'awaiting_address';
      await sendMessage(
        phone,
        '📍 Please enter your address.\n📦 We will dispatch the SCAN2ALERT sticker shortly.'
      );
    } else {
      await sendMessage(
        phone,
        'Please respond with "Yes" or "No".'
      );
    }
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_address') {
      const session = tempComplaints[phone]; // ✅ define session
    const address = text;
     const vehicle = session?.vehicle;

   await Registration.updateOne(
  { 'vehicles.number': vehicle },
  {
    $set: { 'vehicles.$.dispatchAddress': address }
  }
);

    await sendMessage(
      phone,
      '📦 SCAN2ALERT sticker will reach you shortly. Happy driving!'
    );

    delete tempComplaints[phone];
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
    if (!text || text.length < 3 || text.startsWith(' ') || text.endsWith(' ') || /[^a-zA-Z0-9]/.test(text)) {
      await sendMessage(phone, 'Please enter a valid vehicle number.');
      return res.sendStatus(200);
    }

    //     if (/^\s|\s$/.test(text) || /[^a-zA-Z0-9]/.test(text)) {
    //   await sendMessage(phone, 'Please enter number without space or special characters.');
    //   return res.sendStatus(200);
    // }

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

    tempComplaints[phone].vehicle = text;
    tempComplaints[phone].stage = 'awaiting_location';
    // await sendMessage(
    //   phone,
    //   '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
    // );
    await sendLocationRequest(phone);

    await sendMessage(
      phone,
      '📍 Or type your *ZIP code* below if you prefer not to share location.'
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
      // await sendMessage(
      //   phone,
      //   '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
      // );
      await sendLocationRequest(phone);

      await sendMessage(
        phone,
        '📍 Or type your *ZIP code* below if you prefer not to share location.'
      );
    }
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_custom_reason') {
    tempComplaints[phone].reason = text;
    tempComplaints[phone].stage = 'awaiting_location';
    // await sendMessage(
    //   phone,
    //   '📍 Please *share* the location using the 📎 icon.'
    // );
    await sendLocationRequest(phone);
    await sendMessage(
      phone,
      '📍 Or type your *ZIP code* below if you prefer not to share location.'
    );
    return res.sendStatus(200);
  }

  await sendMessage(phone, 'Please send "Hi" to start');
  return res.sendStatus(200);
};

// async function saveComplaint(phone, vehicleNumber, reason, locationText) {
//   await Registration.updateOne(
//     { 'vehicles.number': vehicleNumber },
//     {
//       $set: { 'vehicles.$.status': 'complained' },
//       $push: {
//         'vehicles.$.complaints': {
//           complaint: reason,
//           complainedBy: phone,
//           location: locationText,
//         },
//       },
//     }
//   );

//   const owner = await Registration.findOne({
//     'vehicles.number': vehicleNumber,
//   });

//   if (owner) {
//     await sendMessage(
//       owner.phone,
//       `🚨 Complaint for vehicle ${vehicleNumber}:\n` +
//         `Reason: ${reason}\n` +
//         `Location: ${locationText}\n\nPlease respond:`,
// [
//     'Move in 10 min',
//     'On call, wait',
//     'Moving now'
//   ]
//     );

//     // Save complainant's info to route response back
//     tempComplaints[owner.phone] = {
//       stage: 'awaiting_owner_response',
//       originalComplainant: phone,
//     };
//   }

//   delete tempComplaints[phone];
//   await sendMessage(
//     phone,
//     '✅ We have forwarded your complaint to the vehicle owner. We’ll let you know once they respond.'
//   );
// }
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
    // ✅ Normalize owner's phone to 92xxxxxxxxxx format
    let rawPhone = owner.phone;
    if (!rawPhone.startsWith('92')) {
      rawPhone = rawPhone.replace(/^0/, '92'); // Convert 03xx to 92xx
    }
    const normalizedOwnerPhone = rawPhone.replace(/\D/g, '').trim();

    // ✅ Store temp session with normalized phone
    tempComplaints[normalizedOwnerPhone] = {
      stage: 'awaiting_owner_response',
      originalComplainant: phone,
    };


    // await sendMessage(
    //   normalizedOwnerPhone,
    //   `🚨 Complaint for vehicle ${vehicleNumber}:\n` +
    //   `Reason: ${reason}\n` +
    //   `Location: ${locationText}\n\nPlease respond:`,
    //   ['Will move my vehicle in 5-10 mins', 'On call, wait', 'Moving now']
    // );
    await sendMessage(
  normalizedOwnerPhone,
  `🚨 Complaint for vehicle ${vehicleNumber}\nReason: ${reason}\nLocation: ${locationText}`
);

await sendMessage(
  normalizedOwnerPhone,
  `Please respond:`,
  OWNER_RESPONSE_OPTIONS
);

  }

  delete tempComplaints[phone];

  await sendMessage(
    phone,
    '✅ We have forwarded your complaint to the vehicle owner. We’ll let you know once they respond.'
  );
}

exports.getWebhook = (req, res) => {
  const VERIFY_TOKEN = 'myWebhookSecret1234';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};



















