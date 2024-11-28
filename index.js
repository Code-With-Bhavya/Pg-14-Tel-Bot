import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_TOKEN;
const key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const bot = new TelegramBot(token, { polling: true });


const sendMessageInChunks = async (bot, chatId, message, chunkSize = 4095) => {
    for (let i = 0; i < message.length; i += chunkSize) {
        const chunk = message.slice(i, i + chunkSize);
        await bot.sendMessage(chatId, chunk);
    }
};


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userMessage = msg.text;

    try {
        const result = await model.generateContent(userMessage);
        let reply = result.response.text();

        //Clean up extra whitespace
        reply = reply.trim();

        //Basic formatting - Convert newlines to line breaks
        reply = reply.replace(/\n/g, '\n');

        console.log(reply);
        // Send the message using MarkdownV2
        sendMessageInChunks(bot, chatId, reply)

    } catch (error) {
        console.error('Error generating text:', error);
        let errorMessage = 'Sorry, something went wrong!';
        if (error.response && error.response.data && error.response.data.error) {
          errorMessage = `Error: ${error.response.data.error.message}`; // More informative error
        }
        await bot.sendMessage(chatId, errorMessage);
    }
});

console.log('Bot with AI is running...');