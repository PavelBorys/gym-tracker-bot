const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs');

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, {
    polling: true
});

const DATA_FILE = './data.json';

// --------------------
// загрузка данных
// --------------------
let userSums = {};
let users = new Set();

if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        userSums = data.userSums || {};
        users = new Set(data.users || []);

    } catch (e) {
        userSums = {};
        users = new Set();
    }
}

// --------------------
// сохранение данных
// --------------------
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        userSums,
        users: Array.from(users)
    }, null, 2));
}

// --------------------
// /start
// --------------------
bot.onText(/\/start/, (msg) => {

    const chatId = msg.chat.id;

    users.add(chatId);

    if (!userSums[chatId]) {
        userSums[chatId] = 0;
    }

    saveData();

    bot.sendMessage(chatId, 'Введите стартовую сумму.');
});

// --------------------
// ввод суммы
// --------------------
bot.on('message', (msg) => {

    if (!msg.text) return;
    if (msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;

    if (!isNaN(msg.text)) {

        userSums[chatId] = Number(msg.text);
        saveData();

        bot.sendMessage(
            chatId,
            `Текущая сумма: ${userSums[chatId]} BYN`
        );
    }
});

// --------------------
// cron (Пн, Ср, Пт, Сб 10:30)
// --------------------
cron.schedule('30 10 * * 1,3,5,6', () => {

    users.forEach(chatId => {

        bot.sendMessage(
            chatId,
            'Были на тренировке?',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Да', callback_data: 'gym_yes' },
                            { text: 'Нет', callback_data: 'gym_no' }
                        ]
                    ]
                }
            }
        );

    });

}, {
    timezone: 'Europe/Minsk'
});

// --------------------
// callback buttons
// --------------------
bot.on('callback_query', async (query) => {

    const chatId = query.message.chat.id;

    switch (query.data) {

        case 'gym_yes':

            await bot.sendMessage(
                chatId,
                'Выберите стоимость тренировки',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '-20 BYN', callback_data: 'minus20' }],
                            [{ text: '-40 BYN', callback_data: 'minus40' }]
                        ]
                    }
                }
            );

            break;

        case 'gym_no':

            await bot.sendMessage(
                chatId,
                'Хорошо, до следующей тренировки.'
            );

            break;

        case 'minus20':

            userSums[chatId] -= 20;
            saveData();

            await bot.sendMessage(
                chatId,
                `Списано: 20 BYN\nОстаток: ${userSums[chatId]} BYN`
            );

            break;

        case 'minus40':

            userSums[chatId] -= 40;
            saveData();

            await bot.sendMessage(
                chatId,
                `Списано: 40 BYN\nОстаток: ${userSums[chatId]} BYN`
            );

            break;
    }

    bot.answerCallbackQuery(query.id);
});