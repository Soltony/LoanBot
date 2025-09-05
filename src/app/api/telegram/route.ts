import {NextRequest, NextResponse} from 'next/server';
import TelegramBot from 'node-telegram-bot-api';

// This is a placeholder for your bot's logic.
// You would typically have a more sophisticated state management system.
const userState: Record<number, { view: string; borrowerId?: string }> = {};

// A helper function to send messages back to the user
async function sendMessage(bot: TelegramBot, chatId: number, text: string, options?: TelegramBot.SendMessageOptions) {
    try {
        await bot.sendMessage(chatId, text, options);
    } catch (error) {
        console.error('Failed to send message:', error);
    }
}


async function handleMessage(bot: TelegramBot, message: TelegramBot.Message) {
    const chatId = message.chat.id;
    const text = message.text || '';

    // Initialize state for new users
    if (!userState[chatId]) {
        userState[chatId] = {view: 'AUTH'};
    }

    const currentState = userState[chatId];

    switch (currentState.view) {
        case 'AUTH':
            // In a real app, you would authenticate the user based on their phone number.
            // For this example, we'll just greet them and move to the menu.
            await sendMessage(bot, chatId, `Welcome to LoanBot! We are setting you up.`, {
                reply_markup: {
                    keyboard: [
                        [{text: 'Check Loan Eligibility'}],
                        [{text: 'View My Active Loans'}],
                        [{text: 'My Loan History'}]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
            userState[chatId] = {view: 'MENU', borrowerId: 'borrower-1-telegram'}; // Mock borrower ID
            break;

        case 'MENU':
            switch (text) {
                case 'Check Loan Eligibility':
                    await sendMessage(bot, chatId, 'You chose to check eligibility. This feature is coming soon to Telegram!');
                    break;
                case 'View My Active Loans':
                    await sendMessage(bot, chatId, 'You chose to view active loans. This feature is coming soon to Telegram!');
                    break;
                case 'My Loan History':
                    await sendMessage(bot, chatId, 'You chose to view loan history. This feature is coming soon to Telegram!');
                    break;
                default:
                    await sendMessage(bot, chatId, 'Please select an option from the menu.');
                    break;
            }
            // After handling, you might want to reset the view or wait for more input
            // For simplicity, we stay in the MENU view.
            break;

        default:
            await sendMessage(bot, chatId, 'Sorry, I am a bit confused. Let\'s start over.');
            userState[chatId] = {view: 'AUTH'};
            await handleMessage(bot, message); // Re-run logic for AUTH case
            break;
    }
}


export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is not set.');
        return NextResponse.json({status: 'error', message: 'Bot token not configured'}, {status: 500});
    }

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
