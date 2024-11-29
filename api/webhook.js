import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';

const token = process.env.TELEGRAM_TOKEN; // Add your bot token in .env
const bot = new TelegramBot(token, { polling: false });

const key = process.env.GEMINI_API_KEY; // Add your Gemini API key in .env
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
console.log('Gemini API Key:', process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;

        if (!update.message) {
            return res.status(200).send(); // Acknowledge non-message updates
        }

        const chatId = update.message.chat.id;
        const userMessage = update.message.text;

        try {
            // Generate the response from Gemini
            const result = await model.generateContent(userMessage);
            const reply = result.response.text().trim();

            // Send the generated response to the user
            await bot.sendMessage(chatId, reply);
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
