import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON updates
app.use(express.json());

// Telegram bot setup
const token = process.env.TELEGRAM_TOKEN; // Add your bot token in .env
const bot = new TelegramBot(token, { polling: false });

// Google Generative AI setup
const key = process.env.GEMINI_API_KEY; // Add your API key in .env
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Telegram message handler
app.post('/api/webhook', async (req, res) => {
    const update = req.body;

    if (!update.message) {
        return res.sendStatus(200); // Acknowledge non-message updates
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

    res.sendStatus(200); // Acknowledge Telegram's request
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Bot is running on port ${PORT}`);
});

// Set the webhook (run this code only once or when you redeploy)
const webhookUrl = `https://pg-14-tel-bot.vercel.app/api/webhook`; // Replace with your Vercel webhook URL
const setWebhook = async () => {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
        const data = await res.json();
        console.log('Webhook set:', data);
    } catch (error) {
        console.error('Error setting webhook:', error);
    }
};
setWebhook(); // Call the function to set the webhook
