import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Telegram bot setup
const token = process.env.TELEGRAM_TOKEN; // Add your bot token in .env
const bot = new TelegramBot(token, { polling: false });

// Google Generative AI setup
const key = process.env.GEMINI_API_KEY; // Add your API key in .env
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;

        if (!update.message) {
            return res.status(200).send('No message in update'); // Acknowledge non-message updates
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

        return res.status(200).send('Message processed');
    } else {
        res.status(405).send('Method Not Allowed');
    }
}