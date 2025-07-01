
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
//     process.env.process.env.WHATSAPP_API_URL,
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

//==========     before fixing code ==================================== ////////////////////////////////////////////////




// require('dotenv').config();
// const axios = require('axios');
// const Registration = require('../models/Registration');

// //  const token = "EAAIAjTZBZCCWoBO2xiygYGqA4eWcbgeZBC2qDMHcxB7mP0iwsmcqAv8DD99KvEbhK0mwCmY2QrnO1P4BaqTrZCGvIgTv3MNYoL9HpK5fUXZCXflM60ZBkJvgTpPN0Nti2UTi66Dje5N4giIZAEzdEvznd3jBG8RZBtYZAnZCRnQ7mK0YvZC2cSVt1PAZBkTqt89ZCdW7ZArWwOtZAdavJOzdGVNFZA5qNQX1bZBu6uPKUMTKCS0V5pkHiLLEVRTYFn3E5hwZDZD"
//  const token = process.env.WHATSAPP_TOKEN;

// // function sendMessage(phone, text, buttons = []) {
// //   const data = {
// //     messaging_product: 'whatsapp',
// //     to: phone,
// //     type: buttons.length ? 'interactive' : 'text',
// //     ...(buttons.length
// //       ? {
// //         interactive: {
// //           type: 'button',
// //           body: { text },
// //           action: {
// //             buttons: buttons.map((b, i) => ({
// //               type: 'reply',
// //               reply: { id: `btn_${i}`, title: b },
// //             })),
// //           },
// //         },
// //       }
// //       : { text: { body: text } }),
// //   };

// //   return axios.post(
// //    "https://graph.facebook.com/v23.0/669530022912116/messages",
// //     data,
// //     {
// //       headers: { Authorization: `Bearer ${token}` },
// //     }
// //   );
// // }
// function sendMessage(phone, text, options = []) {
//   const isList = options.length > 3;

//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: options.length ? 'interactive' : 'text',
//     ...(options.length
//       ? isList
//         ? {
//             interactive: {
//               type: 'list',
//               body: { text: text.slice(0, 1024) },
//               action: {
//                 button: 'Choose Option',
//                 sections: [
//                   {
//                     title: 'Complaint Reasons',
//                     rows: options.map((opt, i) => ({
//                       id: `opt_${i}`,
//                       title: opt.title.slice(0, 24),
//                       description: opt.description?.slice(0, 72) || '',
//                     })),
//                   },
//                 ],
//               },
//             },
//           }
//         : {
//             interactive: {
//               type: 'button',
//               body: { text },
//               action: {
//                 buttons: options.slice(0, 3).map((b, i) => ({
//                   type: 'reply',
//                   reply: {
//                     id: `btn_${i}`,
//                     title: typeof b === 'string' ? b : b.title,
//                   },
//                 })),
//               },
//             },
//           }
//       : { text: { body: text } }),
//   };

//   return axios.post(
//     process.env.process.env.WHATSAPP_API_URL,
//     data,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'application/json',
//       },
//     }
//   );
// }

// // async function sendMessage(phone, text, options = []) {
// //   const isList = options.length > 3;
// //   const data = {
// //     messaging_product: 'whatsapp',
// //     to: phone,
// //   };

// //   if (options.length) {
// //     data.type = 'interactive';

// //     if (isList) {
// //       data.interactive = {
// //         type: 'list',
// //         body: { text: text.slice(0, 1024).replace(/\n+/g, ' ') }, // sanitize body
// //         action: {
// //           button: 'Choose', // must be ≤20 chars
// //           sections: [
// //             {
// //               title: 'Options',
// //               // rows: options.map((opt, i) => ({
// //               //   id: `opt_${i}`,
// //               //   title: opt.slice(0, 72), // limit title length
// //               // }))
// //               // 
// //             rows: options.map((opt, i) => ({
// //   id: `opt_${i}`,
// //   title: opt.title.slice(0, 24),
// //   description: opt.description?.slice(0, 72) || ''
// // }))
// // ,
// //             },
// //           ],
// //         },
// //       };
// //     } else {
// //       data.interactive = {
// //         type: 'button',
// //         body: { text },
// //         action: {
// //           buttons: options.slice(0, 3).map((b, i) => ({
// //             type: 'reply',
// //             reply: {
// //               id: `btn_${i}`,
// //               title: b.slice(0, 20),
// //             },
// //           })),
// //         },
// //       };
// //     }
// //   } else {
// //     data.type = 'text';
// //     data.text = { body: text };
// //   }

// //   try {
// //     const response = await axios.post(
// //       'https://graph.facebook.com/v23.0/669530022912116/messages',
// //       data,
// //       {
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //           'Content-Type': 'application/json',
// //         },
// //       }
// //     );
// //     return response;
// //   } catch (err) {
// //     console.error('❌ WhatsApp API Error:', JSON.stringify(err.response?.data, null, 2));
// //   }
// // }

// async function sendLocationRequest(phone) {
//   const data = {
//     messaging_product: 'whatsapp',
//     recipient_type: 'individual',
//     to: phone,
//     type: 'interactive',
//     interactive: {
//       type: 'location_request_message',
//       body: {
//         text: `📍 Let's continue your registration.\nYou can *share your location* or type it manually.`
//       },
//       action: {
//         name: 'send_location'
//       }
//     }
//   };

//   try {
//     await axios.post(
//       process.env.process.env.WHATSAPP_API_URL, // replace with your Phone Number ID
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//   } catch (err) {
//     console.error('❌ Location Request API Error:', err.response?.data || err.message);
//   }
// }


// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   console.log(phone, name, vehicleNo, reason, location);
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'send_alert_to_owner',
//       language: {
//         code: 'en'
//       },
//       components: [
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: name },        // {{1}}
//             { type: 'text', text: vehicleNo },   // {{2}}
//             { type: 'text', text: reason },      // {{3}}
//             { type: 'text', text: location }     // {{4}}
//           ]
//         }
//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//       process.env.process.env.WHATSAPP_API_URL, // e.g., https://graph.facebook.com/v18.0/<phone_number_id>/messages
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template message sent to owner.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }


// function extractText(msg) {
//   if (msg.type === 'text') return msg.text.body.toLowerCase();

//   if (msg.type === 'interactive') {
//     if (msg.interactive.type === 'button_reply') {
//       return msg.interactive.button_reply.title.toLowerCase();
//     }
//     if (msg.interactive.type === 'list_reply') {
//       return msg.interactive.list_reply.title.toLowerCase();
//     }
//   }

//   return '';
// }


// // function extractText(msg) {
// //   if (msg.type === 'text') return msg.text.body.toLowerCase();
// //   if (
// //     msg.type === 'interactive' &&
// //     msg.interactive.type === 'button_reply'
// //   ) {
// //     return msg.interactive.button_reply.title.toLowerCase();
// //   }
// //   return '';
// // }

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
// // const COMPLAINT_REASONS = ['Wrongly parked', 'Obstructing road', 'Other'];
// // const COMPLAINT_REASONS = [ 'Wrong Vehicle Parking',
// //   'Obstructing road',
// //   'No sticker',
// //   'Dangerous parking',
// //   'Other'];

// const COMPLAINT_REASONS = [
//   { title: '❗ Wrong Vehicle Parking', description: 'Your Vehicle Wrongly parked' },
//   { title: 'Blocking road', description: 'Your Vehicle jamming the Road' },
//   { title: 'Lights/Siren/Unlocked', description: 'Lights turned on/ vehicle unlocked/siren going on' },
//   { title: 'Challan Issued', description: 'Generating a challan' },
//   {title:'Towing in Progress', description:'Towing vehicle, move immediately'},
//   { title: 'Other', description: 'Specify your own reason' }
// ];
// const OWNER_RESPONSE_OPTIONS = [
//   {
//     title: 'Move in 5–10 mins',
//     description: 'Will move my vehicle in 5–10 minutes.'
//   },
//   {
//     title: 'On call, wait',
//     description: 'I am held up, will move my vehicle in 15–20 minutes.'
//   },
//   {
//     title: 'Unavailable now',
//     description: 'I am unavailable now. Sorry for the inconvenience.'
//   },
//   {
//     title: 'Delegate moving',
//     description: 'I have informed someone else to move the vehicle.'
//   },
//   {
//     title: 'Spam/Prank',
//     description: 'This complaint seems to be spam or a prank.'
//   }
// ];


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

//   // if (message.type === 'location') {
//   //   const { latitude, longitude } = message.location;
//   //   const locationText = await reverseGeocode(latitude, longitude);

//   //   const session = tempComplaints[phone];
//   //   if (session?.stage === 'awaiting_location') {
//   //     if (session.isRegistering) {
//   //       const { name: userName, vehicle } = session;
//   //       await Registration.findOneAndUpdate(
//   //         { phone },
//   //         {
//   //           $set: { name: userName },
//   //           $push: {
//   //             vehicles: {
//   //               number: vehicle,
//   //               location: locationText,
//   //               complaints: [],
//   //             },
//   //           },
//   //         },
//   //         { upsert: true }
//   //       );

//   //       delete tempComplaints[phone];
//   //       await sendMessage(
//   //         phone,
//   //         `✅ Thank you. Your vehicle ${vehicle} is successfully registered with us. Your data is safe with us.`
//   //       );
//   //     } else {
//   //       await saveComplaint(
//   //         phone,
//   //         session.vehicleNumber,
//   //         session.reason,
//   //         locationText
//   //       );
//   //     }
//   //     return res.sendStatus(200);
//   //   }
//   // }

//   if (tempComplaints[phone]?.stage === 'awaiting_location') {
//     const session = tempComplaints[phone];
//     let locationText = '';

//     if (message.type === 'location') {
//       const { latitude, longitude } = message.location;
//       locationText = await reverseGeocode(latitude, longitude);
//     } else if (message.type === 'text') {
//       const zip = message.text?.body?.trim();
//       if (!zip || !/^\d{4,8}$/.test(zip)) {
//         await sendMessage(
//           phone,
//           '❌ Please enter a valid ZIP code (4-8 digits) or share your location.'
//         );
//         return res.sendStatus(200);
//       }
//       locationText = `ZIP Code: ${zip}`;
//     } else {
//       await sendMessage(
//         phone,
//         '📍 Please either *share your location* or *type your ZIP code*.'
//       );
//       return res.sendStatus(200);
//     }

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
//               dispatchAddress: "",
//               complaints: [],
//             },
//           },
//         },
//         { upsert: true }
//       );

//       delete tempComplaints[phone];
//       await sendMessage(
//         phone,
//         `✅ Thank you. Your vehicle ${vehicle} is successfully registered with us.\n📍 Location: ${locationText}`
//       );

//       tempComplaints[phone] = {
//         stage: 'awaiting_sticker_response',
//         vehicle: vehicle,
//       };

//       await sendMessage(
//         phone,
//         'Do you have a SCAN2ALERT sticker with you?',
//         ['Yes', 'No']
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

//   if (tempComplaints[phone]?.stage === 'awaiting_sticker_response') {

//     if (text === 'yes') {
//       await sendMessage(
//         phone,
//         '✅ Please affix the label at the rear window of your vehicle. Happy driving!'
//       );
//       delete tempComplaints[phone];
//     } else if (text === 'no') {
//       tempComplaints[phone].stage = 'awaiting_address';
//       await sendMessage(
//         phone,
//         '📍 Please enter your address.\n📦 We will dispatch the SCAN2ALERT sticker shortly.'
//       );
//     } else {
//       await sendMessage(
//         phone,
//         'Please respond with "Yes" or "No".'
//       );
//     }
//     return res.sendStatus(200);
//   }

//   if (tempComplaints[phone]?.stage === 'awaiting_address') {
//       const session = tempComplaints[phone]; // ✅ define session
//     const address = text;
//      const vehicle = session?.vehicle;

//    await Registration.updateOne(
//   { 'vehicles.number': vehicle },
//   {
//     $set: { 'vehicles.$.dispatchAddress': address }
//   }
// );

//     await sendMessage(
//       phone,
//       '📦 SCAN2ALERT sticker will reach you shortly. Happy driving!'
//     );

//     delete tempComplaints[phone];
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
//     if (!text || text.length < 3 || text.startsWith(' ') || text.endsWith(' ') || /[^a-zA-Z0-9]/.test(text)) {
//       await sendMessage(phone, 'Please enter a valid vehicle number.');
//       return res.sendStatus(200);
//     }

//     //     if (/^\s|\s$/.test(text) || /[^a-zA-Z0-9]/.test(text)) {
//     //   await sendMessage(phone, 'Please enter number without space or special characters.');
//     //   return res.sendStatus(200);
//     // }

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
//     // await sendMessage(
//     //   phone,
//     //   '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
//     // );
//     await sendLocationRequest(phone);

//     await sendMessage(
//       phone,
//       '📍 Or type your *ZIP code* below if you prefer not to share location.'
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
//       // await sendMessage(
//       //   phone,
//       //   '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
//       // );
//       await sendLocationRequest(phone);

//       await sendMessage(
//         phone,
//         '📍 Or type your *ZIP code* below if you prefer not to share location.'
//       );
//     }
//     return res.sendStatus(200);
//   }

//   if (tempComplaints[phone]?.stage === 'awaiting_custom_reason') {
//     tempComplaints[phone].reason = text;
//     tempComplaints[phone].stage = 'awaiting_location';
//     // await sendMessage(
//     //   phone,
//     //   '📍 Please *share* the location using the 📎 icon.'
//     // );
//     await sendLocationRequest(phone);
//     await sendMessage(
//       phone,
//       '📍 Or type your *ZIP code* below if you prefer not to share location.'
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


//     // await sendMessage(
//     //   normalizedOwnerPhone,
//     //   `🚨 Complaint for vehicle ${vehicleNumber}:\n` +
//     //   `Reason: ${reason}\n` +
//     //   `Location: ${locationText}\n\nPlease respond:`,
//     //   ['Will move my vehicle in 5-10 mins', 'On call, wait', 'Moving now']
//     // );
// //     await sendMessage(
// //   normalizedOwnerPhone,
// //   `🚨 Complaint for vehicle ${vehicleNumber}\nReason: ${reason}\nLocation: ${locationText}`
// // );

// await sendComplaintTemplate(
//   normalizedOwnerPhone,
//   owner.name || 'Owner',
//   vehicleNumber,  
//   reason,
//   locationText
// );


// await sendMessage(
//   normalizedOwnerPhone,
//   `Please respond:`,
//   OWNER_RESPONSE_OPTIONS
// );

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




////////today changes ////////////////




require('dotenv').config();
const axios = require('axios');
const Registration = require('../models/Registration');

//  const token = "EAATDUOPTCisBO0P2H3ySY2PZA497ZA7OqrZAwmzWlPgh5HQtrgAcuAh1xKJnyayBvigb2GWKM1Bkwm3IdFkx5bZAeiPZBTZByDolsAH5T04myMWzrXXoXmLucXT8ZA8wZCQfkGMLEB7B3dMd2S06ZCpDEYjlv56TimmxOeFLKZApt4D3Nu8dyvooWxQSDFOeLWZAgZDZD"
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
        text: `📍 Please share your location or enter pincode`
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

async function sendAddressRequest(phone) {
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone, // Must be a valid Indian phone number like +91XXXXXXXXXX
    type: 'interactive',
    interactive: {
      type: 'address_message',
      body: {
        text: "📍 Please provide the address where you'd like us to deliver your Scan2Alert sticker."
      },
      action: {
        name: 'address_message',
        parameters: {
          country: 'IN', // Mandatory
          values: {
            name: 'Scan2Alert User', // optional, prefilled name
            phone_number: phone // must match +91 format
          }
        }
      }
    }
  };

  try {
    const res = await axios.post(
     process.env.WHATSAPP_API_URL, // example: https://graph.facebook.com/v15.0/PHONE_NUMBER_ID/messages
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Address message sent. Message ID:', res.data.messages?.[0]?.id);
  } catch (err) {
    console.error('❌ Address Request API Error:', err.response?.data || err.message);
  }
}

// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'send_alert_to_owner',
//       language: {
//         code: 'en'
//       },
//       components: [
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: name },        // {{1}}
//             { type: 'text', text: vehicleNo },   // {{2}}
//             { type: 'text', text: reason },      // {{3}}
//             { type: 'text', text: location }     // {{4}}
//           ]
//         }
//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//   "process.env.WHATSAPP_API_URL", // e.g., https://graph.facebook.com/v18.0/<phone_number_id>/messages
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template message sent to owner.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }



// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'send_alert_to_owner',
//       language: {
//         code: 'en'
//       },
//       components: [
//         {
//           type: 'header',
//           sub_type: 'image',
//           parameters: [
//             {
//               type: 'image',
//               image: {
//                 link: 'https://yourdomain.com/sample.jpg' // ✅ Must be publicly accessible image
//               }
//             }
//           ]
//         },
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: vehicleNo },
//             { type: 'text', text: reason },
//             { type: 'text', text: location }
//           ]
//         }
//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//       "process.env.WHATSAPP_API_URL",
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template message sent to owner.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }

// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'send_complaint_3', // Make sure this matches the approved template name
//       language: { code: 'en' },
//       components: [
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: name },        // {{1}} → Name
//             { type: 'text', text: vehicleNo },   // {{2}} → Vehicle No
//             { type: 'text', text: reason },      // {{3}} → Reason
//             { type: 'text', text: location }     // {{4}} → Location
//           ]
//         }
//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//       'process.env.WHATSAPP_API_URL',
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template sent successfully.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }

// async function sendComplaintWithResponseOptions(phone, name, vehicleNo, reason, location) {
//   const plainText = `Hello ${name},

// Someone raised an alert about your vehicle *${vehicleNo}* 🚨

// Issue faced: *${reason}*
// Location: *${location}*

// Please respond using the options below 👇`;

//   // 1. Plain text message
//   const textData = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'text',
//     text: {
//       body: plainText,
//       preview_url: false
//     }
//   };

//   // 2. List response options
//   const listData = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'interactive',
//     interactive: {
//       type: 'list',
//       header: {
//         type: 'text',
//         text: 'Respond to Complaint'
//       },
//       body: {
//         text: 'Please select how you wish to respond:'
//       },
//       footer: {
//         text: 'Scan2Alert'
//       },
//       action: {
//         button: 'Choose Response',
//         sections: [
//           {
//             title: 'Options',
//             rows: [
//               {
//                 id: 'move_soon',
//                 title: 'Will Move in 5–10 mins',
//                 description: 'Acknowledged, moving vehicle'
//               },
//               {
//                 id: 'call_later',
//                 title: 'On Call – Wait',
//                 description: 'Busy at the moment'
//               },
//               {
//                 id: 'invalid_alert',
//                 title: 'This is a spam alert',
//                 description: 'No action needed'
//               }
//             ]
//           }
//         ]
//       }
//     }
//   };

//   try {
//     const [textRes, listRes] = await Promise.all([
//       axios.post(
//         'process.env.WHATSAPP_API_URL',
//         textData,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       ),
//       axios.post(
//         'process.env.WHATSAPP_API_URL',
//         listData,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       )
//     ]);

//     console.log('✅ Complaint message and list options sent successfully');
//     return { text: textRes.data, list: listRes.data };
//   } catch (err) {
//     console.error('❌ Error sending messages:', err.response?.data || err.message);
//   }
// }

// async function sendComplaintWithList(phone, name, vehicleNo, reason, location) {
//   const listData = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'interactive',
//     interactive: {
//       type: 'list',
//       header: {
//         type: 'text',
//         text: '🚨 Vehicle Complaint'
//       },
//       body: {
//         text:
// `Hello ${name},

// Someone raised an alert about your vehicle *${vehicleNo}*.

// Issue: *${reason}*
// Location: *${location}*

// Please choose how you want to respond below 👇`
//       },
//       footer: {
//         text: 'Scan2Alert'
//       },
//       action: {
//         button: 'Choose Response',
//         sections: [
//           {
//             title: 'Available Responses',
//             rows: [
//               {
//                 id: 'move_soon',
//                 title: 'Will Move in 5–10 mins',
//                 description: 'Acknowledged, moving vehicle'
//               },
//               {
//                 id: 'call_later',
//                 title: 'On Call – Wait',
//                 description: 'Busy at the moment'
//               },
//               {
//                 id: 'invalid_alert',
//                 title: 'This is a spam alert',
//                 description: 'No action needed'
//               }
//             ]
//           }
//         ]
//       }
//     }
//   };

//   try {
//     const res = await axios.post(
//       'process.env.WHATSAPP_API_URL',
//       listData,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Complaint list message sent successfully');
//     return res.data;
//   } catch (err) {
//     console.error('❌ Error sending list message:', err.response?.data || err.message);
//   }
// }



// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'testing_9', // 👈 replace with your approved template name
//       language: {
//         code: 'en'
//       },
//       components: [
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: name },        // {{1}} - Owner's name
//             { type: 'text', text: vehicleNo },   // {{2}} - Vehicle No
//             { type: 'text', text: reason },      // {{3}} - Reason
//             { type: 'text', text: location }     // {{4}} - Location
//           ]
//         },
//         {
//           type: 'button',
//           sub_type: 'flow',
//           index: 0, // 👈 this must match the button position in your template
//           parameters: [
//             {
//               type: 'flow',
//               flow: {
//                 name: 'Message templates_send_complaint_UTILITY_96c4d', // 👈 exact flow name from Meta (case-sensitive)
//                 params: {
//                   // Optional: if your flow requires parameters
//                 }
//               }
//             }
//           ]
//         }
//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//       'process.env.WHATSAPP_API_URL',
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template message sent to owner.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }

// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'testing_9', // 👈 Your approved template name
//       language: { code: 'en' },
//       components: [
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: name },
//             { type: 'text', text: vehicleNo },
//             { type: 'text', text: reason },
//             { type: 'text', text: location }
//           ]
//         },
//         {
//   "type": "button",
//   "sub_type": "flow",
//   "index": 0,
//   "parameters": [
//     {
//       "type": "flow",
//       "flow": {
//         "name": "templates_send_complaint_UTILITY_96c4d"
//       }
//     }
//   ]
// }

//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//       'process.env.WHATSAPP_API_URL',
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template message sent to owner.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }

async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
  const data = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'send_complaint_4', // ✅ your approved template name
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: vehicleNo },
            { type: 'text', text: reason },
            { type: 'text', text: location }
          ]
        },
         {
        "type": "button",
        "sub_type": "flow",
        "index": "0",
        "parameters": [
          {
            "type": "action",
            "action": {
              "flow_token": "1500471944449330",
              "flow_action_data": {
                "complaint_reason": "Blocking gate"
              }
            }
          }
        ]
      }
      ]
    }
  };

  try {
    const response = await axios.post(
      'https://graph.facebook.com/v19.0/693787413814595/messages',
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Template message sent successfully.');
    return response.data;
  } catch (err) {
    console.error('❌ Template send error:', err.response?.data || err.message);
  }
}




// async function sendComplaintTemplate(phone, name, vehicleNo, reason, location) {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: phone,
//     type: 'template',
//     template: {
//       name: 'word', // 👈 use your actual template name
//       language: {
//         code: 'en'
//       },
//       components: [
//         {
//           type: 'body',
//           parameters: [
//             { type: 'text', text: name },        // {{1}} - Owner's name
//             { type: 'text', text: vehicleNo },   // {{2}} - Vehicle No
//             { type: 'text', text: reason },      // {{3}} - Reason
//             { type: 'text', text: location }     // {{4}} - Location
//           ]
//         }
//       ]
//     }
//   };

//   try {
//     const response = await axios.post(
//       'process.env.WHATSAPP_API_URL',
//       data,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );
//     console.log('✅ Template message sent to owner.');
//     return response.data;
//   } catch (err) {
//     console.error('❌ Template send error:', err.response?.data || err.message);
//   }
// }


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
  { title: 'Wrong Vehicle Parking', description: 'Vehicle wrongly parked' },
  { title: 'Blocking road', description: 'Vehicle blocking the road, jamming' },
  { title: 'Lights/Siren/Unlocked', description: 'Vehicle blocking the driveway' },
  { title: 'Challan Issued', description: 'Challan being issued ,move vehicle asap.' },
  {title: 'Near My Shop', description: 'Vehicle before my house/shop'},
  { title: 'Towing in Progress', description: 'Towing in progress, move vehicle asap' },
  { title: 'Other', description: 'Specify your own reason' }
];
const OWNER_RESPONSE_OPTIONS = [
    {
    title: 'Thanks, On It',
    description: 'Thank you. Will do the needful'
  },
  {
    title: 'Move in 5–10 mins',
    description: 'Will move vehicle in 5–10 minutes.'
  },
  {
    title: 'On call, wait',
    description: 'Help up , will move  vehicle in 15–20 minutes.'
  },
  {
    title: 'Unavailable now',
    description: 'Very sorry.I am out of station'
  },
  {
    title: 'Working on It ASAP',
    description: 'Have informed will solve asap'
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
    const response = extractText(message).trim().toUpperCase();
    // Extract response as uppercase (from your existing logic)
// Step 1: Get response JSON string from interactive message
const responseJsonString = message?.interactive?.nfm_reply?.response_json;

let forwardedReason = '';
let customMessage = '';

try {
  const parsed = JSON.parse(responseJsonString);

  const rawForwarded = parsed['screen_0_This_message_will_be_forwarded_0'];
  const rawCustomMsg = parsed['screen_0_Type_custom_message__1'];

  // ✅ Remove number prefix & all underscores completely
  if (rawForwarded && typeof rawForwarded === 'string') {
    forwardedReason = rawForwarded
      .replace(/^\d+_/, '')   // Remove number prefix like 4_
      .replace(/_/g, ' ')      // Remove all underscores completely
      .trim();
  }

  // ✅ Custom message as-is (just trim)
  if (rawCustomMsg && typeof rawCustomMsg === 'string') {
    customMessage = rawCustomMsg.trim();
  }

} catch (err) {
  console.error('❌ Failed to parse or extract flow data:', err.message);
}

// ✅ Final Clean Outputs
     // Goood

    const complainantPhone = tempComplaints[phone].originalComplainant;

// ✅ Final Output
if (complainantPhone) {
  // Case 1: Both forwarded reason & custom message exist
  if (forwardedReason && customMessage) {
    await sendMessage(
      complainantPhone,
      `📩 The vehicle owner responded:\n"${forwardedReason}"\n"${customMessage}"`
    );
  }
  // Case 2: Only forwarded reason exists
  else if (forwardedReason && !customMessage) {
    await sendMessage(
      complainantPhone,
      `📩 The vehicle owner responded:\n"${forwardedReason}"`
    );
  }
    // const complainantPhone = tempComplaints[phone].originalComplainant;

}
    // if (complainantPhone) {
    //   await sendMessage(
    //     complainantPhone,
    //     `📩 The vehicle owner responded:\n"${forwardedReason}"`
    //   );
    // }

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

      // ✅ Proceed to save new vehicle
      await Registration.findOneAndUpdate(
        { phone },
        {
          $set: { name: userName.toUpperCase() },
          $push: {
            vehicles: {
              number: vehicle.toUpperCase(),
              location: locationText,
              dispatchAddress: '',
              complaints: [],
              registeredAt: new Date()  // optional: timestamp for later fix
            },
          },
        },
        { upsert: true }
      );

      delete tempComplaints[phone];

      await sendMessage(
        phone,
        `✅ Thank you ${userName.toUpperCase()}. Your vehicle ${vehicle.toUpperCase()} is successfully registered with us.\nYour data is safe with us.`
      );

      tempComplaints[phone] = {
        stage: 'awaiting_sticker_response',
        vehicle: vehicle,
      };

      await sendMessage(
        phone,
        '📦 Do you have a physical SCAN2ALERT sticker with you?',
        ['YES', 'NO']
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
      `Welcome to Scan2Alert! 🚗\nThank you for choosing us.\n\nScan2Alert is free for all!\nYour data will remain confidential and secure!\n\nWhat would you like to do?`,
      ['Register', 'Raise an issue']
    );
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_sticker_response') {

    if (text === 'yes') {
      await sendMessage(
        phone,
        '✅ Please affix the sticker on the rear windshield of your vehicle. Happy driving!'
      );
      delete tempComplaints[phone];
    } else if (text === 'no') {
      tempComplaints[phone].stage = 'awaiting_address';
      // await sendMessage(
      //   phone,
      //   '📍 Please enter your address.\n📦 You’d like Scan2Alert sticker delivered to.'
      // );
      await sendAddressRequest(phone);
    } else {
      await sendMessage(
        phone,
        'Please respond with "Yes" or "No".'
      );
    }
    return res.sendStatus(200);
  }

  // if (tempComplaints[phone]?.stage === 'awaiting_address') {
  //   const session = tempComplaints[phone]; // ✅ define session
  //   const address = text.toUpperCase();
  //   const vehicle = session?.vehicle;

  //   await Registration.updateOne(
  //     { 'vehicles.number': vehicle.toUpperCase() },
  //     {
  //       $set: { 'vehicles.$.dispatchAddress': address }
  //     }
  //   );

  //   await sendMessage(
  //     phone,
  //     '📦 We will dispatch the SCAN2ALERT sticker at the earliest, shall reach you shortly. Happy driving!'
  //   );

  //   delete tempComplaints[phone];
  //   return res.sendStatus(200);
  // }

  if (tempComplaints[phone]?.stage === 'awaiting_address') {
    const session = tempComplaints[phone];
    const vehicle = session?.vehicle;
    let address = '';

    // ✅ Handle structured WhatsApp address
    if (
      message.type === 'interactive' &&
      message.interactive?.type === 'nfm_reply' &&
      message.interactive?.nfm_reply?.name === 'address_message'
    ) {
      const responseData = JSON.parse(message.interactive.nfm_reply.response_json);
      const values = responseData.values || {};

      address = `${values.name || ''}, ${values.address || ''}, ${values.city || ''}, ${values.state || ''}, ${values.in_pin_code || ''}`.toUpperCase();
    }
    // ✅ Fallback to manually typed address
    else if (message.type === 'text') {
      address = text.toUpperCase();
    }
    // ❌ Invalid format
    else {
      await sendMessage(phone, '❌ Please provide your address using the address form or type it manually.');
      return res.sendStatus(200);
    }

    // ✅ Save to database
    await Registration.updateOne(
      { 'vehicles.number': vehicle.toUpperCase() },
      {
        $set: { 'vehicles.$.dispatchAddress': address }
      }
    );

    await sendMessage(
      phone,
      '📦 We will dispatch the SCAN2ALERT sticker at the earliest. Happy driving!'
    );

    delete tempComplaints[phone];
    return res.sendStatus(200);
  }



  // if (text === 'register') {
  //   await sendMessage(phone, 'Please enter your name:');
  //   tempComplaints[phone] = {
  //     stage: 'awaiting_name',
  //     isRegistering: true,
  //   };
  //   return res.sendStatus(200);
  // }

  if (text === 'register') {
    const existingUser = await Registration.findOne({ phone });

    if (existingUser) {
      // ✅ User already exists — skip name, prompt for vehicle
      await sendMessage(
        phone,
        'You’re already registered.\nPlease enter your Vehicle Number.'
      );

      tempComplaints[phone] = {
        stage: 'awaiting_vehicle',
        isRegistering: true,
        name: existingUser.name,
      };
    } else {
      // 🆕 New user — ask for name
      await sendMessage(phone, 'Please enter your name:');
      tempComplaints[phone] = {
        stage: 'awaiting_name',
        isRegistering: true,
      };
    }

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

    tempComplaints[phone].name = text.toUpperCase();
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

    const existingUser = await Registration.findOne({ phone });
    const vehicleCount = existingUser?.vehicles?.length || 0;

    // if (vehicleCount >= 3) {
    //   await sendMessage(
    //     phone,
    //     '❌ You have already registered 3 vehicles. This is the maximum allowed per account.'
    //   );
    //   delete tempComplaints[phone];
    //   return res.sendStatus(200);
    // }

    const vehicleExists = await Registration.exists({
      'vehicles.number': text.toUpperCase(),
    });

    if (vehicleExists) {
      await sendMessage(
        phone,
        `❌ Vehicle number ${text} is already registered. Please use a different number.`
      );
      return res.sendStatus(200);
    }

    tempComplaints[phone].vehicle = text.toUpperCase();
    tempComplaints[phone].stage = 'awaiting_location';
    // await sendMessage(
    //   phone,
    //   '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
    // );
    await sendLocationRequest(phone);

    // await sendMessage(
    //   phone,
    //   '📍 Or type your *ZIP code* below if you prefer not to share location.'
    // );
    return res.sendStatus(200);
  }

  if (text === 'raise an issue') {
    await sendMessage(
      phone,
      'Please enter the Vehicle no for which you want to raise complaint:'
    );

    tempComplaints[phone] = { stage: 'awaiting_vehicle' };
    return res.sendStatus(200);
  }

  
  if (tempComplaints[phone]?.stage === 'awaiting_vehicle') {  
    // const vehicleExists = await Registration.exists({
    //   'vehicles.number': text.toUpperCase(),
    // });
    const vehicleExists = await Registration.findOne(
      { 'vehicles.number': text.toUpperCase() },
      { 'vehicles.$': 1 }
    );

    if (vehicleExists) {
      const complaints = vehicleExists.vehicles[0].complaints || [];
      const now = Date.now();
      const recentComplaint = complaints.find(c => {
        return (
          c.complainedBy === phone &&
          new Date(c.at).getTime() > now - 15 * 60 * 1000
        );
      });
      // if (recentComplaint) {
      //   await sendMessage(
      //     phone,
      //     '❌ You have already submitted a complaint for this vehicle. Please try again after 15 minutes.'
      //   );
      //   return res.sendStatus(200)
      // }
      const recentUniqueUsers = new Set(
        complaints
          .filter(c => new Date(c.at).getTime() > now - 15 * 60 * 1000)
          .map(c => c.complainedBy)
      );
      if (recentUniqueUsers.size >= 3) {
        await sendMessage(
          phone,
          '❌ You have already submitted a complaint for this vehicle. Please try again after 15 minutes.'
        );
        return res.sendStatus(200)
      } 

      const twentyFourHourLimit = now - 24 * 60 * 60 * 1000;
      const complaintsInLast24Hrs = complaints.filter(c =>
        c.complainedBy === phone &&
        new Date(c.at).getTime() > twentyFourHourLimit
      );
      // if (complaintsInLast24Hrs.length >= 3) {
      //   await sendMessage(
      //     phone,
      //     '❌ You have submitted multiple complaints. Please send the complaint tomorrow.'
      //   );
      //   return res.sendStatus(200)
      // }
      tempComplaints[phone] = {
        stage: 'awaiting_reason',
        vehicleNumber: text,
      };
      await sendMessage(
        phone,
        'What is the issue you are facing:',
        COMPLAINT_REASONS
      );
      return res.sendStatus(200)
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
      tempComplaints[phone].reason = text.toUpperCase();
      tempComplaints[phone].stage = 'awaiting_location';
      // await sendMessage(
      //   phone,
      //   '📍 Please *share* your live location using the 📎 (attachment) icon in WhatsApp.'
      // );
      await sendLocationRequest(phone);

      // await sendMessage(
      //   phone,
      //   '📍 Or type your *ZIP code* below if you prefer not to share location.'
      // );
    }
    return res.sendStatus(200);
  }

  if (tempComplaints[phone]?.stage === 'awaiting_custom_reason') {
    tempComplaints[phone].reason = text.toUpperCase();
    tempComplaints[phone].stage = 'awaiting_location';
    // await sendMessage(
    //   phone,
    //   '📍 Please *share* the location using the 📎 icon.'
    // );
    await sendLocationRequest(phone);
    // await sendMessage(
    //   phone,
    //   '📍 Or type your *ZIP code* below if you prefer not to share location.'
    // );
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
  const vehicleNO = vehicleNumber.toUpperCase();
  // 3. Save complaint with timestamp
  await Registration.updateOne(
    { 'vehicles.number': vehicleNO },
    {
      $set: { 'vehicles.$.status': 'complained' },
      $push: {
        'vehicles.$.complaints': {
          complaint: reason,
          complainedBy: phone,
          location: locationText,
          timestamp: new Date()
        }
      }
    }
  );

  // 4. Fetch owner for notification
  const owner = await Registration.findOne({
    'vehicles.number': vehicleNO
  });

  if (owner) {
    // Normalize owner's phone to 92xxxxxxxxxx
    let rawPhone = owner.phone;
    if (!rawPhone.startsWith('92')) {
      rawPhone = rawPhone.replace(/^0/, '92');
    }
    const normalizedOwnerPhone = rawPhone.replace(/\D/g, '').trim();

    // Track temp session for response
    tempComplaints[normalizedOwnerPhone] = {
      stage: 'awaiting_owner_response',
      originalComplainant: phone
    };

    // Send template message to owner
    await sendComplaintTemplate(
      normalizedOwnerPhone,
      owner.name || 'Owner',
      vehicleNO,
      reason,
      locationText
    );

    // Send response options
    // await sendMessage(
    //   normalizedOwnerPhone,
    //   `Please respond:`,
    //   OWNER_RESPONSE_OPTIONS
    // );
  }

  // 5. Confirmation message to complainant
  await sendMessage(
    phone,
    ` We have forwarded the issue you are facing to the vehicle owner.\n\n` +
    ` We will get back to you once the vehicle owner responds.\n\n` +
    ` Thank you for choosing Scan2Alert.\n\n` +
    ` Scan2Alert is free for all. If you wish to register your vehicle with us, please send “Hi”.`
  );

  // 6. Clear temp session
  delete tempComplaints[phone];
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




















