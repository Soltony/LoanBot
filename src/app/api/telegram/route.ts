
import {NextRequest, NextResponse} from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { getBorrowerByPhone, getActiveLoans, getProviders, getEligibility, getTransactions } from '@/lib/mockApi';

let botInstance: TelegramBot | null = null;

// A simple in-memory store to track user states
const userState = new Map<number, string>();

const initializeBot = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set in .env file.');
    }

    if (botInstance) {
        return botInstance;
    }
    
    console.log("Initializing Telegram bot with long polling...");
    const bot = new TelegramBot(token, { polling: true });
    botInstance = bot;

    bot.onText(/\/start/, (msg) => {
        handleStart(bot, msg.chat.id);
    });

    // This handles messages that are not commands
    bot.on('message', (msg) => {
        // Ignore commands that are handled by other listeners
        if (msg.text?.startsWith('/')) return;

        const chatId = msg.chat.id;
        // Check if we are expecting a phone number from this user
        if (userState.get(chatId) === 'awaiting_phone') {
            handleCheck(bot, chatId, msg.text || '');
        }
    });
    
    bot.onText(/\/check (.+)/, (msg, match) => {
        const chatId = msg.chat.id;
        const phoneNumber = match ? match[1] : '';
        handleCheck(bot, chatId, phoneNumber);
    });

    bot.on('callback_query', (callbackQuery) => handleCallbackQuery(bot, callbackQuery));

    bot.on('polling_error', (error) => {
        console.error('Polling error:', error.message);
    });
    
    bot.on('webhook_error', (error) => {
        console.error('Webhook error:', error.message);
    });
    
    console.log("Telegram bot successfully initialized.");

    return bot;
};


async function handleStart(bot: TelegramBot, chatId: number) {
    const welcomeMessage = `Welcome to LoanBot! 🏦

To get started, please send me your 9-digit phone number registered with the bank.`;

    // Set the state for this user to indicate we're waiting for their phone number
    userState.set(chatId, 'awaiting_phone');

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleCheck(bot: TelegramBot, chatId: number, phoneNumber: string) {
    if (!phoneNumber) {
        await bot.sendMessage(chatId, 'Please provide your phone number. Example: `912345678`', { parse_mode: 'Markdown' });
        return;
    }

    try {
        const borrower = await getBorrowerByPhone(phoneNumber);
        // Clear the user's state since we've received the phone number
        userState.delete(chatId);
        
        const welcomeMessage = `Hello, *${borrower.name}*! What would you like to do today?`;

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Check Loan Eligibility', callback_data: `eligibility_${borrower.id}` }],
                    [{ text: 'View My Active Loans', callback_data: `active_loans_${borrower.id}` }],
                    [{ text: 'My Loan History', callback_data: `history_${borrower.id}` }],
                ]
            }
        };

        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', ...opts });

    } catch (error) {
        await bot.sendMessage(chatId, `Sorry, the phone number *${phoneNumber}* is not registered. Please check the number and try again.`, { parse_mode: 'Markdown' });
    }
}

async function handleCallbackQuery(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery) {
    const message = callbackQuery.message;
    if (!message || !callbackQuery.data) return;

    const chatId = message.chat.id;
    const [action, ...args] = callbackQuery.data.split('_');

    await bot.answerCallbackQuery(callbackQuery.id);

    switch(action) {
        case 'eligibility':
            await handleEligibility(bot, chatId, args[0]);
            break;
        case 'provider':
             await handleProviderSelection(bot, chatId, args[0], args[1]);
            break;
        case 'active_loans':
            await handleActiveLoans(bot, chatId, args[0]);
            break;
        case 'history':
            await handleHistory(bot, chatId, args[0]);
            break;
    }
}

async function handleEligibility(bot: TelegramBot, chatId: number, borrowerId: string) {
    try {
        const providers = await getProviders();
        const opts = {
            reply_markup: {
                inline_keyboard: providers.map(p => ([{ text: p.name, callback_data: `provider_${borrowerId}_${p.id}` }]))
            }
        };
        await bot.sendMessage(chatId, 'Please select a loan provider to check your eligibility:', opts);
    } catch (error) {
        await bot.sendMessage(chatId, 'Sorry, there was an error fetching providers. Please try again later.');
    }
}

async function handleProviderSelection(bot: TelegramBot, chatId: number, borrowerId: string, providerId: string) {
    try {
        const eligibility = await getEligibility(borrowerId, providerId);
        let responseText = `*Your Eligibility Results:*\n\n`;

        if (eligibility.products.length > 0) {
            eligibility.products.forEach(p => {
                responseText += `*${p.name}*\nLimit: *${p.limit.toLocaleString()} ETB*\nInterest: ${p.interestRate}%\n\n`;
            });
        } else {
            responseText += 'You are not eligible for any products at this time.';
            if (eligibility.reason) {
                responseText += `\nReason: ${eligibility.reason}`;
            }
        }
        await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
    } catch (error) {
        await bot.sendMessage(chatId, 'Sorry, could not fetch your eligibility at this moment.');
    }
}


async function handleActiveLoans(bot: TelegramBot, chatId: number, borrowerId: string) {
    try {
        const loans = await getActiveLoans(borrowerId);
        const unpaidLoans = loans.filter(loan => loan.repaymentStatus === 'Unpaid');

        if (unpaidLoans.length > 0) {
            let responseText = '*Your Active Loans:*\n\n';
            unpaidLoans.forEach(loan => {
                const dueDate = new Date(loan.dueDate).toLocaleDateString();
                responseText += `*${loan.productName}*\n`;
                responseText += `Total Due: *${loan.totalRepayableAmount.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}*\n`;
                responseText += `Amount Repaid: ${loan.amountRepaid.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}\n`;
                responseText += `Due Date: ${dueDate}\n\n`;
            });
             await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
        } else {
             await bot.sendMessage(chatId, 'You have no active loans at the moment. 🎉');
        }
    } catch (error) {
        await bot.sendMessage(chatId, 'Sorry, there was an error fetching your active loans.');
    }
}

async function handleHistory(bot: TelegramBot, chatId: number, borrowerId: string) {
    try {
        const transactions = await getTransactions(borrowerId);
        if (transactions.length > 0) {
            let responseText = '*Your Transaction History:*\n\n';
            transactions.slice(0, 10).forEach(txn => { // Limit to last 10 transactions
                const txnDate = new Date(txn.date).toLocaleDateString();
                const amount = txn.amount.toLocaleString('en-US', { style: 'currency', currency: 'ETB' });
                responseText += `${txnDate} - ${txn.description} - *${amount}*\n`;
            });
            await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, 'You have no transaction history.');
        }
    } catch (error) {
        await bot.sendMessage(chatId, 'Sorry, there was an error fetching your transaction history.');
    }
}


// This endpoint now simply ensures the bot is running.
// The bot itself handles messages via long polling.
export async function GET(request: NextRequest) {
    try {
        initializeBot();
        return NextResponse.json({status: 'ok', message: 'Bot is running with long polling.'});
    } catch (error: any) {
        console.error('Error initializing Telegram bot:', error);
        return NextResponse.json({status: 'error', message: error.message || 'Internal server error'}, {status: 500});
    }
}

// The POST endpoint is no longer used for webhooks but can be kept for other purposes or removed.
export async function POST(request: NextRequest) {
    return NextResponse.json({status: 'ok', message: 'POST endpoint is not used for polling.'});
}
