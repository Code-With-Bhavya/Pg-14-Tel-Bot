import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import fs from 'fs';

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

// Telegram webhook handler
export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;

        if (!update.message) {
            return res.status(200).send(); // Acknowledge non-message updates
        }

        const chatId = update.message.chat.id;
        const userMessage = update.message.text.trim();

        try {
            if (userMessage === '/start') {
                // Display menu options
                await bot.sendMessage(chatId, "Welcome to the AI Bot! Choose an option below:", {
                    reply_markup: {
                        keyboard: [["Generate Text"], ["Generate Image"], ["Help"]],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });
            } else if (userMessage === "Generate Text") {
                await bot.sendMessage(chatId, "Send your text query, and I'll generate a response for you!");
                bot.once("message", async (textMsg) => {
                    const userInput = textMsg.text;
                    const result = await model.generateContent(userInput);
                    const reply = result.response.text().trim();
                    await bot.sendMessage(chatId, reply);
                });
            } else if (userMessage === "Generate Image") {
                await bot.sendMessage(chatId, "Send the description of the image you want to generate.");
                bot.once("message", async (imageMsg) => {
                    const description = imageMsg.text;
                    await bot.sendMessage(chatId, "Generating your image, please wait...");
                    const imageBlob = await generateImage(description);

                    // Save and send the image
                    const filePath = `generated-image-${Date.now()}.png`;
                    const buffer = Buffer.from(await imageBlob.arrayBuffer());
                    fs.writeFileSync(filePath, buffer);

                    await bot.sendPhoto(chatId, filePath, { caption: `Here is your image for: "${description}"` });
                    fs.unlinkSync(filePath); // Clean up
                });
            } else if (userMessage === "Help") {
                await bot.sendMessage(
                    chatId,
                    "Use the menu to:\n- Select 'Generate Text' for text responses.\n- Select 'Generate Image' to create images.\n- Or type /start to view the menu again."
                );
            } else {
                // Default fallback
                await bot.sendMessage(chatId, "I didn't understand that. Use /start to see the menu.");
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = error.response?.data?.error?.message || 'Sorry, something went wrong!';
            await bot.sendMessage(chatId, errorMessage);
        }

        res.status(200).send(); // Acknowledge Telegram's request
    } else {
        res.status(405).send('Method Not Allowed'); // Handle non-POST requests
    }
}
