const axios = require('axios');
const Barcode = require('../models/Barcode');
const BarcodeItem = require('../models/BarcodeItem');

// const token = "EAATDUOPTCisBO0P2H3ySY2PZA497ZA7OqrZAwmzWlPgh5HQtrgAcuAh1xKJnyayBvigb2GWKM1Bkwm3IdFkx5bZAeiPZBTZByDolsAH5T04myMWzrXXoXmLucXT8ZA8wZCQfkGMLEB7B3dMd2S06ZCpDEYjlv56TimmxOeFLKZApt4D3Nu8dyvooWxQSDFOeLWZAgZDZD";
// const url = 'https://graph.facebook.com/v22.0/830078310189900/messages';
const token = process.env.WHATSAPP_TOKEN;
const url = process.env.WHATSAPP_API2_URL ;
const tempSession = {};

async function sendFoundItemTemplate(phone, itemName, tag) {

  const data = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: "lost_found",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: itemName },
            { type: "text", text: tag },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [
            { type: "payload", payload: "yes_connect" },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [
            { type: "payload", payload: "no_ignore" },
          ],
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (err) {
    console.error("❌ Error sending found item template:", err.response?.data || err.message);
  }
}
async function sendMessage(phone, text, buttons = []) {
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
            buttons: buttons.map((title, i) => ({
              type: 'reply',
              reply: { id: `btn_${i}`, title },
            })),
          },
        },
      }
      : { text: { body: text } }),
  };

  try {
    await axios.post(url, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('❌ SendMessage Error:', err.response?.data || err.message);
  }
}
// async function addBarcode(phone, barcode, itemName) {
//   let user = await BarcodeItem.findOne({ phone });

//   if (!user) {
//     user = new BarcodeItem({
//       phone,
//       barcodes: [{ barcode, itemName }],
//     });
//   } else {
//     user.barcodes.push({ barcode, itemName });
//   }

//   await user.save();
//   console.log('✅ Barcode saved successfully');
// }
async function addBarcode(phone, barcode, itemName) {
  let user = await BarcodeItem.findOne({ phone });

  if (!user) {
    user = new BarcodeItem({
      phone,
      barcodes: [{ barcode, itemName }],
    });
  } else {
    if (user.barcodes.length >= 5) {
      console.log("⚠️ User reached max barcode limit (5).");
      throw new Error("LIMIT_REACHED");
    }
    user.barcodes.push({ barcode, itemName });
  }

  await user.save();
  console.log('✅ Barcode saved successfully');
}


function extractText(msg) {
  if (msg.type === 'text') return msg.text.body.trim();

  if (msg.type === 'interactive') {
    const btn = msg.interactive?.button_reply;
    if (btn?.id) return btn.id.trim();
    if (btn?.title) return btn.title.trim();
  }

  if (msg.button) {
    if (msg.button.payload) return msg.button.payload.trim();
    if (msg.button.text) return msg.button.text.trim();
  }

  return '';
}

exports.handleBarcodeWebhook = async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return res.sendStatus(200);

  const phone = message.from.replace(/\D/g, '');
  const text = extractText(message);
  if (/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6}$/i.test(text)) {
    const existing = await Barcode.findOne({
      barcode: { $regex: `^${text}$`, $options: 'i' },
    });


    if (existing) {
      if (existing.status === false) {
        tempSession[phone] = { stage: 'awaiting_item_name', barcode: text };

        await sendMessage(
          phone,
          `✅ Great! Your tag (Code: *${text}*) is now registered with Scan2Alert.\n\nIf this item is ever found, we’ll notify you here on WhatsApp.`
        );
        await sendMessage(
          phone,
          `📝 To help you identify it later, please tell us what item this tag is attached to.\n\nExample: Laptop Bag, Wallet, Dog Collar, Suitcase, Bike Key, etc.`
        );
      }

      else {
        const item = await BarcodeItem.findOne(
          { "barcodes.barcode": text },
          { "barcodes.$": 1, phone: 1 }
        );

        if (item) {
          const found = item.barcodes[0];

          if (item.phone === phone) {
            await sendMessage(
              phone,
              `🔒 This tag is already registered to your WhatsApp number. No need to register again.`
            );
            return res.sendStatus(200);
          }

          tempSession[phone] = { stage: 'finder_scanned', barcode: text };

          await sendMessage(
            phone,
            `🙏 Thank you for helping!\nThe owner of *${found.itemName}* has been notified.\nThey may contact you shortly to coordinate the return.`
          );

          const ownerPhone = item.phone;
          tempSession[ownerPhone] = { stage: 'owner_decision', finder: phone, barcode: text };
          await sendFoundItemTemplate(
            ownerPhone,
            found.itemName,
            text
          );
        } else {
          await sendMessage(phone, '⚠️ This tag is registered but missing item info.');
        }
      }

    } else {
      await sendMessage(phone, '❌ Invalid barcode. Enter a valid 6-character code');
    }

    return res.sendStatus(200);
  }

  // if (tempSession[phone]?.stage === 'awaiting_item_name') {
  //   const { barcode } = tempSession[phone];
  //   const itemName = text;

  //   await addBarcode(phone, barcode, itemName);
  //   await Barcode.findOneAndUpdate({ barcode }, { status: true });
  //   await sendMessage(
  //     phone,
  //     `Perfect 👍 Your item is saved as *${itemName}*.\nIf it’s ever lost, we’ll alert you right here when someone scans your tag.\n\nYou’re all set! 🎉\nTip: Stick this tag securely where it’s easy to scan.`
  //   );

  //   delete tempSession[phone];
  //   return res.sendStatus(200);
  // }

if (tempSession[phone]?.stage === 'awaiting_item_name') {
  const { barcode } = tempSession[phone];
  const itemName = text;

  try {
    await addBarcode(phone, barcode, itemName);
    await Barcode.findOneAndUpdate({ barcode }, { status: true });
    
    await sendMessage(
      phone,
      `Perfect 👍 Your item is saved as *${itemName}*.\nIf it’s ever lost, we’ll alert you right here when someone scans your tag.\n\nYou’re all set! 🎉`
    );
  } catch (err) {
    if (err.message === 'LIMIT_REACHED') {
      await sendMessage(
        phone,
        `⚠️ You’ve already registered 5 items.\nYou can’t register more tags.`
      );
    } else {
      await sendMessage(phone, `❌ Error saving item. Please try again.`);
    }
  }

  delete tempSession[phone];
  return res.sendStatus(200);
}



  if (tempSession[phone]?.stage === 'owner_decision') {
    const finderPhone = tempSession[phone].finder;
    const barcode = tempSession[phone].barcode;

    const item = await BarcodeItem.findOne(
      { "barcodes.barcode": barcode },
      { "barcodes.$": 1, phone: 1 }
    );

    if (!item || !item.barcodes?.length) {
      await sendMessage(phone, '⚠️ Item information not found for this barcode.');
      return res.sendStatus(200);
    }

    const found = item.barcodes[0];



    if (text === 'yes_connect') {
      await sendMessage(
        phone,
        `👍 Done! Here’s the finder’s WhatsApp number: +${finderPhone}\nYou can now chat directly to coordinate the return of your *${found.itemName}*.`
      );

      await sendMessage(
        finderPhone,
        `✅ The owner of *${found.itemName}* has agreed to connect. They’ll contact you shortly. Thank you for helping! 💚`
      );

      delete tempSession[phone];
    } else if (text === 'no_ignore') {
      tempSession[phone] = { stage: 'owner_ignore_check', finder: finderPhone, barcode };
      await sendMessage(
        phone,
        `⚠️ Are you sure you want to *ignore* the finder for your *${found.itemName}*?`,
        ['Yes, ignore', 'No, connect instead']
      );
    }

    return res.sendStatus(200);
  }



  if (tempSession[phone]?.stage === 'owner_ignore_check') {
    const finderPhone = tempSession[phone].finder;
    const barcode = tempSession[phone].barcode;

    const item = await BarcodeItem.findOne(
      { "barcodes.barcode": barcode },
      { "barcodes.$": 1, phone: 1 }
    );

    if (!item || !item.barcodes?.length) {
      await sendMessage(phone, '⚠️ Item information not found for this barcode.');
      return res.sendStatus(200);
    }

    const found = item.barcodes[0];



    if (text.toLowerCase().includes('yes') || text === 'btn_0' || text.toLowerCase().includes('ignore')) {

      await sendMessage(phone, `🙏 Thanks for your time 💚`);
      await sendMessage(
        finderPhone,
        `🚫 The owner of *${found.itemName}* decided not to connect right now.`
      );
      delete tempSession[phone];
    } else if (text.toLowerCase().includes('no') || text === 'btn_1' || text.toLowerCase().includes('connect')) {

      await sendMessage(
        phone,
        `👍 Done! Here’s the finder’s WhatsApp number: +${finderPhone}\nYou can now chat directly to coordinate the return of your *${found.itemName}*.`
      );

      await sendMessage(
        finderPhone,
        `✅ The owner of *${found.itemName}* has agreed to connect. They’ll contact you shortly. Thank you for helping! 💚`
      );

      delete tempSession[phone];
    }

    return res.sendStatus(200);
  }


  const item = await BarcodeItem.findOne({ phone, barcode: text });
  if (item) {
    await sendMessage(
      phone,
      `ℹ️ This tag (Code: *${text}*) is already registered to your WhatsApp number.\nNo need to register again.`
    );
    return res.sendStatus(200);
  }

  await sendMessage(phone, '📍 Please send a valid 6-character barcode (letters + numbers).');
  res.sendStatus(200);
};
