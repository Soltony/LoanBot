import {NextRequest, NextResponse} from 'next/server';
import TelegramBot from 'node-telegram-bot-api';

// This is where we'll handle incoming messages.
// We'll build this out in the next steps.
async function handleMessage(bot: TelegramBot, message: TelegramBot.Message) {
    const chatId = message.chat.id;
    // For now, it just acknowledges the message.
    await bot.sendMessage(chatId, `I'm not very smart yet, but I received your message!`);
}


export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is not set.');
        return NextResponse.json({status: 'error', message: 'Bot token not configured'}, {status: 500});
    }

    // We don't need to set the webhook here, this is done once manually.
    const bot = new TelegramBot(token);

    try {
        const body = await request.json();
        console.log('Received Telegram update:', body);

        // A message can be a text message, a command, or other types.
        if (body.message) {
            await handleMessage(bot, body.message);
        }

        return NextResponse.json({status: 'ok'});
    } catch (error) {
        console.error('Error processing Telegram update:', error);
        return NextResponse.json({status: 'error', message: 'Internal server error'}, {status: 500});
    }
}
