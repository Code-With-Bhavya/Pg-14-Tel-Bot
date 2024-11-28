import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import express from 'express'; // Add this if you're using Express

const app = express(); // Initialize the Express app
const PORT = process.env.PORT || 3000;

dotenv.config();

const token = process.env.TELEGRAM_TOKEN;
const key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    let tempMessage;

    try {
        // Step 1: Send a temporary "..." message
        tempMessage = await bot.sendMessage(chatId, '...');

        // Step 2: Animate the "..." message
        const dots = ['.', '..', '...'];
        let animationIndex = 0;
        const animationInterval = setInterval(async () => {
            animationIndex = (animationIndex + 1) % dots.length;
            try {
                await bot.editMessageText(dots[animationIndex], {
                    chat_id: chatId,
                    message_id: tempMessage.message_id,
                });
            } catch (e) {
                console.error('Animation error:', e);
            }
        }, 1000);

        // Step 3: Generate the response
        const result = await model.generateContent(userMessage);
        let reply = result.response.text();

        // Clean and format the response
        reply = reply.trim().replace(/\n/g, '\n');

        // Stop the animation
        clearInterval(animationInterval);

        // Step 4: Update the message with the result and send the final response
        await bot.editMessageText('Processing complete!', {
            chat_id: chatId,
            message_id: tempMessage.message_id,
        });
        await bot.deleteMessage(chatId, tempMessage.message_id);

        await sendMessageInChunks(bot, chatId, reply);

    } catch (error) {
        // Handle errors and update the user
        console.error('Error generating text:', error);
        const errorMessage = error.response?.data?.error?.message || 'Sorry, something went wrong!';
        if (tempMessage) {
            try {
                await bot.editMessageText(errorMessage, {
                    chat_id: chatId,
                    message_id: tempMessage.message_id,
                });
            } catch (e) {
                console.error('Error editing message:', e);
            }
        } else {
            await bot.sendMessage(chatId, errorMessage);
        }
    }
});

app.listen(PORT, () => {
    console.log('Bot with AI is running...');
});
