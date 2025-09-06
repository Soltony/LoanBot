import {NextRequest, NextResponse} from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { getBorrowerByPhone, getActiveLoans, getProviders, getEligibility } from '@/lib/mockApi';

async function handleStart(bot: TelegramBot, chatId: number) {
    const welcomeMessage = `Welcome to LoanBot! 🏦

To get started, please use the /check command with your registered phone number.

Example: \`/check 912345678\``;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleCheck(bot: TelegramBot, chatId: number, phoneNumber: string) {
    if (!phoneNumber) {
        await bot.sendMessage(chatId, 'Please provide your phone number. Example: `/check 912345678`', { parse_mode: 'Markdown' });
        return;
    }

    try {
        const borrower = await getBorrowerByPhone(phoneNumber);
        const welcomeMessage = `Hello, ${borrower.name}! What would you like to do today?`;

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Check Loan Eligibility', callback_data: `eligibility_${borrower.id}` }],
                    [{ text: 'View My Active Loans', callback_data: `active_loans_${borrower.id}` }],
                    [{ text: 'My Loan History', callback_data: `history_${borrower.id}` }],
                ]
            }
        };

        await bot.sendMessage(chatId, welcomeMessage, opts);

    } catch (error) {
        await bot.sendMessage(chatId, `Sorry, the phone number ${phoneNumber} is not registered. Please check the number and try again.`);
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
                responseText += `*${p.name}*\nLimit: *${p.limit.toLocaleString()}*\nInterest: ${p.interestRate}%\n\n`;
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


// This is the main entry point for the Telegram webhook.
export async function POST(request: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN is not set.');
        return NextResponse.json({status: 'error', message: 'Bot token not configured'}, {status: 500});
    }

    const bot = new TelegramBot(token);

    try {
        const body = await request.json();
        console.log('Received Telegram update:', JSON.stringify(body, null, 2));

        if (body.message) {
            const message = body.message;
            const chatId = message.chat.id;
            const text = message.text || '';

            if (text.startsWith('/start')) {
                await handleStart(bot, chatId);
            } else if (text.startsWith('/check')) {
                const phoneNumber = text.split(' ')[1];
                await handleCheck(bot, chatId, phoneNumber);
            } else {
                await bot.sendMessage(chatId, `I'm not sure how to handle that. Try /start.`);
            }
        } else if (body.callback_query) {
            await handleCallbackQuery(bot, body.callback_query);
        }

        return NextResponse.json({status: 'ok'});
    } catch (error) {
        console.error('Error processing Telegram update:', error);
        return NextResponse.json({status: 'error', message: 'Internal server error'}, {status: 500});
    }
}

    