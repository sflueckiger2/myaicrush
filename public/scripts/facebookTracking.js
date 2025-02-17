require("dotenv").config();
const axios = require("axios");

const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const FB_API_URL = `https://graph.facebook.com/v17.0/${PIXEL_ID}/events`;

async function sendFacebookEvent(eventName, userData, customData) {
    const payload = {
        data: [
            {
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                user_data: userData,
                custom_data: customData,
                action_source: "website"
            }
        ],
        access_token: ACCESS_TOKEN
    };

    try {
        const response = await axios.post(FB_API_URL, payload);
        console.log(`Facebook Event Sent: ${eventName}`, response.data);
    } catch (error) {
        console.error(`Error sending ${eventName}:`, error.response ? error.response.data : error.message);
    }
}

module.exports = { sendFacebookEvent };
