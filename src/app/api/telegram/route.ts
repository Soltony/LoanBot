
import {NextRequest, NextResponse} from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { getBorrowerByPhoneForBot, getActiveLoansForBot, getProvidersForBot, getEligibilityForBot, getTransactionsForBot, applyForLoanForBot } from '@/lib/mockApi';

let botInstance: TelegramBot | null = null;
const userState = new Map<number, {state: string, borrowerId?: string, productId?: string}>();


const initializeBot = () => {
    if (botInstance) {
        console.log("Bot instance already exists. Polling is active.");
        return botInstance;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('--- TELEGRAM BOT FAILED TO START ---');
        console.error('TELEGRAM_BOT_TOKEN is not set. Please add it to your .env file and restart the server.');
        return null;
    }

    console.log("Initializing new Telegram bot instance...");
    try {
        const bot = new TelegramBot(token, { polling: true });
        botInstance = bot;

        bot.on('polling_error', (error) => {
            console.error('Polling error:', error.code, '-', error.message);
            if (error.code === 'ETELEGRAM') {
                 console.error('Telegram API Error. This might be due to an invalid token or network issues.');
            }
        });

        bot.onText(/\/start/, (msg) => {
            console.log(`Received /start command from chat ID: ${msg.chat.id}`);
            handleStart(bot, msg.chat.id);
        });

        bot.on('message', (msg) => {
            const chatId = msg.chat.id;
            if (msg.text?.startsWith('/')) {
                return;
            }

            const currentState = userState.get(chatId);
            
            console.log(`Received message from chat ID: ${chatId}. Current state: ${currentState?.state}`);
            if (currentState?.state === 'awaiting_phone') {
                handleCheck(bot, chatId, msg.text || '');
            } else if (currentState?.state === 'awaiting_loan_amount') {
                handleLoanAmount(bot, chatId, msg.text || '');
            }
        });

        bot.on('callback_query', (callbackQuery) => {
            console.log(`[BOT LOG] Received callback_query with data: "${callbackQuery.data}"`);
            handleCallbackQuery(bot, callbackQuery);
        });
        
        console.log('--- TELEGRAM BOT IS RUNNING ---');
        console.log('Bot is now polling for messages. You can now interact with your bot in Telegram.');
        return bot;
    } catch(error) {
        console.error('--- TELEGRAM BOT FAILED TO INITIALIZE ---', error);
        return null;
    }
};


async function handleStart(bot: TelegramBot, chatId: number) {
    const welcomeMessage = `Welcome to LoanBot! 🏦

To get started, please send me your 9-digit phone number registered with the bank.`;
    userState.set(chatId, {state: 'awaiting_phone'});
    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}

async function handleCheck(bot: TelegramBot, chatId: number, messageText: string) {
    console.log(`[BOT LOG] handleCheck received raw message text: "${messageText}"`);

    const phoneNumber = messageText.replace(/\D/g, '');
    console.log(`[BOT LOG] Extracted phone number: "${phoneNumber}"`);

    if (!phoneNumber || phoneNumber.length < 9) {
        await bot.sendMessage(chatId, 'That doesn\'t look like a valid phone number. Please enter your 9-digit phone number.', { parse_mode: 'Markdown' });
        return;
    }

    try {
        const borrower = await getBorrowerByPhoneForBot(phoneNumber);
        console.log('[BOT LOG] API call successful. Received borrower:', borrower);
        userState.set(chatId, { state: 'authenticated', borrowerId: borrower.id });
        
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

    } catch (error: any) {
        console.error(`[BOT LOG] Failed to get borrower for phone ${phoneNumber}. Full Error:`, error);
        await bot.sendMessage(chatId, `Sorry, the phone number *${phoneNumber}* is not registered. Please check the number and try again.`, { parse_mode: 'Markdown' });
    }
}

async function handleCallbackQuery(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery) {
    const message = callbackQuery.message;
    if (!message || !callbackQuery.data) {
        console.error('[BOT ERROR] Callback query is missing message or data.');
        return;
    }

    const chatId = message.chat.id;
    const data = callbackQuery.data;
    const parts = data.split('_');
    
    // Improved action/args parsing
    let action: string;
    let args: string[] = [];

    // Check if the last part is a borrower ID (assuming it's a long string or number)
    // A simple heuristic: check if it looks like an ID. This might need refinement.
    const potentialId = parts[parts.length - 1];
    const isIdPresent = parts.length > 1 && (potentialId.length > 10 || !isNaN(parseInt(potentialId)));

    if (isIdPresent) {
        action = parts.slice(0, -1).join('_');
        args = [potentialId];
    } else {
        action = data; // The whole string is the action, e.g., 'main_menu'
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
    
    const currentState = userState.get(chatId);
    console.log(`[BOT LOG] Handling action: '${action}' for chat ID ${chatId}. Current state:`, JSON.stringify(currentState));

    switch(action) {
        case 'eligibility':
            await handleEligibility(bot, chatId, args[0]);
            break;
        case 'provider':
             await handleProviderSelection(bot, chatId, args[0], args[1]);
            break;
        case 'apply':
            await handleApply(bot, chatId, args[0], args[1]);
            break;
        case 'active_loans':
            if (!currentState?.borrowerId) {
                 console.error(`[BOT ERROR] 'active_loans' action failed: No borrowerId found in state for chat ${chatId}.`);
                 await bot.sendMessage(chatId, 'Your session seems to have expired. Please start over with /start.');
                 return;
            }
             await handleActiveLoans(bot, chatId, currentState.borrowerId);
            break;
        case 'history':
            if (!currentState?.borrowerId) {
                 console.error(`[BOT ERROR] 'history' action failed: No borrowerId found in state for chat ${chatId}.`);
                 await bot.sendMessage(chatId, 'Your session seems to have expired. Please start over with /start.');
                 return;
            }
            await handleHistory(bot, chatId, currentState.borrowerId);
            break;
        case 'main_menu':
            console.log(`[BOT LOG] Entering 'main_menu' handler.`);
            if (currentState?.borrowerId) {
                console.log(`[BOT LOG] Found borrowerId: ${currentState.borrowerId}. Sending main menu.`);
                 const welcomeMessage = `What else would you like to do today?`;
                    const opts = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Check Loan Eligibility', callback_data: `eligibility_${currentState.borrowerId}` }],
                                [{ text: 'View My Active Loans', callback_data: `active_loans_${currentState.borrowerId}` }],
                                [{ text: 'My Loan History', callback_data: `history_${currentState.borrowerId}` }],
                            ]
                        }
                    };
                await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown', ...opts });
            } else {
                console.error(`[BOT ERROR] 'main_menu' action failed: No borrowerId found in state for chat ${chatId}.`);
                await bot.sendMessage(chatId, 'Your session seems to have expired. Please start over with /start.');
            }
            break;
        default:
             console.log(`[BOT LOG] Unknown action received: ${action}`);
             break;
    }
}

async function handleEligibility(bot: TelegramBot, chatId: number, borrowerId: string) {
    try {
        const providers = await getProvidersForBot();
        const keyboard = providers.map(p => ([{ text: p.name, callback_data: `provider_${borrowerId}_${p.id}` }]));
        keyboard.push([{ text: '« Back to Main Menu', callback_data: `main_menu` }]);
        const opts = {
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
        await bot.sendMessage(chatId, 'Please select a loan provider to check your eligibility:', opts);
    } catch (error) {
        console.error("Error in handleEligibility:", error);
        await bot.sendMessage(chatId, 'Sorry, there was an error fetching providers. Please try again later.');
    }
}

async function handleProviderSelection(bot: TelegramBot, chatId: number, borrowerId: string, providerId: string) {
    try {
        const eligibility = await getEligibilityForBot(borrowerId, providerId);
        let responseText = `*Your Eligibility Results:*\n\n`;
        
        const keyboard = [];

        if (eligibility.products.length > 0) {
            eligibility.products.forEach(p => {
                responseText += `*${p.name}*\nLimit: *${p.limit.toLocaleString()} ETB*\nInterest: ${p.interestRate}%\n\n`;
                if(p.limit > 0){
                    keyboard.push([{ text: `Apply for ${p.name}`, callback_data: `apply_${borrowerId}_${p.id}` }]);
                }
            });
        } else {
            responseText += 'You are not eligible for any products at this time.';
            if (eligibility.reason) {
                responseText += `\nReason: ${eligibility.reason}`;
            }
        }

        keyboard.push([{ text: '« Back to Providers', callback_data: `eligibility_${borrowerId}` }]);

        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
        await bot.sendMessage(chatId, responseText, opts);
    } catch (error) {
        console.error("Error in handleProviderSelection:", error);
        await bot.sendMessage(chatId, 'Sorry, could not fetch your eligibility at this moment.');
    }
}

async function handleApply(bot: TelegramBot, chatId: number, borrowerId: string, productId: string) {
    userState.set(chatId, { state: 'awaiting_loan_amount', borrowerId, productId });
    await bot.sendMessage(chatId, 'Please enter the amount you would like to borrow:');
}

async function handleLoanAmount(bot: TelegramBot, chatId: number, amountText: string) {
    const currentState = userState.get(chatId);
    if (!currentState || !currentState.borrowerId || !currentState.productId) {
        await bot.sendMessage(chatId, 'Something went wrong. Please start over with /start.');
        return;
    }

    const amount = parseFloat(amountText.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
        await bot.sendMessage(chatId, 'Please enter a valid number for the loan amount.');
        return;
    }

    try {
        await applyForLoanForBot({
            borrowerId: currentState.borrowerId,
            productId: currentState.productId,
            loanAmount: amount,
        });
        await bot.sendMessage(chatId, `Congratulations! Your loan request for *${amount.toLocaleString()} ETB* has been approved and disbursed. 🎉`, { parse_mode: 'Markdown'});
        userState.set(chatId, { state: 'authenticated', borrowerId: currentState.borrowerId });
    } catch (error: any) {
        const errorMessage = error.message || 'An unknown error occurred.';
        await bot.sendMessage(chatId, `Sorry, your loan application could not be processed.\nReason: ${errorMessage}`);
        userState.set(chatId, { state: 'authenticated', borrowerId: currentState.borrowerId });
    }
    
    // Always show the main menu afterwards
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '« Back to Main Menu', callback_data: 'main_menu' }]
            ]
        }
    };
    await bot.sendMessage(chatId, 'You can now go back to the main menu.', opts);
}


async function handleActiveLoans(bot: TelegramBot, chatId: number, borrowerId: string) {
    console.log(`[BOT LOG] Entering handleActiveLoans for borrowerId: ${borrowerId}`);
    try {
        const loans = await getActiveLoansForBot(borrowerId);
        console.log('[BOT LOG] Raw loans received from API:', JSON.stringify(loans, null, 2));

        const unpaidLoans = loans.filter(loan => loan.repaymentStatus === 'Unpaid');
        console.log('[BOT LOG] Filtered unpaid loans:', JSON.stringify(unpaidLoans, null, 2));


        let responseText: string;
        if (unpaidLoans.length > 0) {
            responseText = '*Your Active Loans:*\n\n';
            unpaidLoans.forEach(loan => {
                const dueDate = new Date(loan.dueDate).toLocaleDateString('en-GB');
                const totalDue = loan.totalRepayableAmount || (loan.loanAmount + (loan.serviceFee || 0));
                const repaid = loan.amountRepaid || 0;
                
                responseText += `*${loan.productName}*\n`;
                responseText += `Total Due: *${totalDue.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}*\n`;
                responseText += `Amount Repaid: ${repaid.toLocaleString('en-US', { style: 'currency', currency: 'ETB' })}\n`;
                responseText += `Due Date: ${dueDate}\n\n`;
            });
        } else {
             responseText = 'You have no active unpaid loans at the moment. All previous loans have been settled. 🎉';
        }
        
        console.log(`[BOT LOG] Final response text to be sent: "${responseText}"`);
        
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '« Back to Main Menu', callback_data: `main_menu` }]
                ]
            }
        };
        await bot.sendMessage(chatId, responseText, opts);

    } catch (error) {
        console.error("[BOT ERROR] In handleActiveLoans:", error);
        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '« Back to Main Menu', callback_data: `main_menu` }]
                ]
            }
        };
        await bot.sendMessage(chatId, 'Sorry, there was an error fetching your active loans.', opts);
    }
}

async function handleHistory(bot: TelegramBot, chatId: number, borrowerId: string) {
    try {
        const transactions = await getTransactionsForBot(borrowerId);
        let responseText: string;

        if (transactions.length > 0) {
            responseText = '*Your Transaction History:*\n\n';
            transactions.slice(0, 10).forEach(txn => { // Limit to last 10 transactions
                const txnDate = new Date(txn.date).toLocaleDateString('en-GB');
                const amount = txn.amount.toLocaleString('en-US', { style: 'currency', currency: 'ETB' });
                responseText += `${txnDate} - ${txn.description} - *${amount}*\n`;
            });
        } else {
            responseText = 'You have no transaction history.';
        }
        
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '« Back to Main Menu', callback_data: `main_menu` }]
                ]
            }
        };
        await bot.sendMessage(chatId, responseText, opts);

    } catch (error) {
        console.error("Error in handleHistory:", error);
        await bot.sendMessage(chatId, 'Sorry, there was an error fetching your transaction history.');
    }
}

export async function GET(request: NextRequest) {
    console.log("GET /api/telegram called. Initializing bot...");
    const bot = initializeBot();
    if (bot) {
        return NextResponse.json({status: 'ok', message: 'Bot is polling for messages.'});
    } else {
        return NextResponse.json({status: 'error', message: 'Bot initialization failed. Check server logs.'}, { status: 500 });
    }
}
