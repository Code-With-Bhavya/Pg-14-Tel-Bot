import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

// Telegram and Gemini setup
const token = process.env.TELEGRAM_TOKEN; // Add your bot token in .env
const bot = new TelegramBot(token, { polling: false });

const key = process.env.GEMINI_API_KEY; // Add your Gemini API key in .env
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Hugging Face API setup
const hfToken = process.env.HF_API_KEY; // Add your Hugging Face API key in .env
async function generateImage(description) {
    const response = await fetch("https://api-inference.huggingface.co/models/ZB-Tech/Text-to-Image", {
        headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: description }),
    });

    if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
    }
    return await response.blob();
}

// Handle incoming messages
export default async function handler(req, res) {

    if (req.method === 'POST') {
        const update = req.body;

        if (!update.message) {
            return res.status(200).send(); // Acknowledge non-message updates
        }

        const chatId = update.message.chat.id;
        const userMessage = update.message.text;

        try {

            if (userMessage.startsWith('/image')) {

                const imageDescription = userMessage.replace('/image', '').trim();


                if (!imageDescription) {
                    await bot.sendMessage(chatId, 'Please provide a description after the /image command.');
                    return res.status(200).send();
                }

                const imageBlob = await generateImage(imageDescription)


                const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
                await bot.sendPhoto(chatId, imageBuffer, { caption: `Here is your image for: "${imageDescription}"` });

            }
            else {
                //default text 
                const result = await model.generateContent(userMessage);
                const reply = result.response.text().trim();

                // Send the generated response to the user
                await bot.sendMessage(chatId, reply);
            }
        } catch (error) {
            console.error('Error generating text:', error);
            const errorMessage = error.response?.data?.error?.message || 'Sorry, something went wrong!';
            await bot.sendMessage(chatId, errorMessage);
        }

        res.status(200).send(); // Acknowledge Telegram's request
    } else {
        res.status(405).send('Method Not Allowed'); // Handle non-POST requests
    }
}
