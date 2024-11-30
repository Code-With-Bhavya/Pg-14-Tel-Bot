import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import fs from 'fs';

// Telegram and Gemini setup
const token = process.env.TELEGRAM_TOKEN; // Add your bot token in .env
const bot = new TelegramBot(token, { polling: true });

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
export default async function(){
    const chatId = msg.chat.id;
    const userMessage = msg.text?.trim();

    try {
        if (userMessage === '/image') {
            // Set a temporary state to indicate the bot expects an image description next
            await bot.sendMessage(chatId, 'Please send the description of the image you want to generate.');
            bot.once('message', async (imageMsg) => {
                const description = imageMsg.text;
                try {
                    await bot.sendMessage(chatId, 'Generating your image, please wait...');
                    const imageBlob = await generateImage(description);

                    // Save and send the image
                    const filePath = `generated-image-${Date.now()}.png`;
                    const buffer = Buffer.from(await imageBlob.arrayBuffer());
                    fs.writeFileSync(filePath, buffer);

                    await bot.sendPhoto(chatId, filePath, { caption: `Here is your image for: "${description}"` });
                    fs.unlinkSync(filePath); // Clean up
                } catch (imageError) {
                    console.error('Error generating image:', imageError);
                    await bot.sendMessage(chatId, 'Failed to generate the image. Please try again.');
                }
            });
        } else {
            // Default behavior: Text generation
            const result = await model.generateContent(userMessage);
            const reply = result.response.text().trim();
            await bot.sendMessage(chatId, reply);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        const errorMessage = error.response?.data?.error?.message || 'Sorry, something went wrong!';
        await bot.sendMessage(chatId, errorMessage);
    }
}
