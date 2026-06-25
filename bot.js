const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const fs = require('fs');

const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('BOT_TOKEN not found');
    process.exit(1);
}

const bot = new TelegramBot(token, {
    polling: true
});

const DATA_FILE = './data.json';

let userSums = {};
let users = new Set();

// --------------------
// загрузка данных
// --------------------
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, 'utf8')
        );

        userSums = data.userSums || {};
        users = new Set(data.users || []);

    } catch (e) {
        console.error('Load error:', e);

        userSums = {};
        users = new Set();
    }
}

// --------------------
// сохранение данных
// --------------------
function saveData() {

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
            {
                userSums,
                users: Array.from(users)
            },
            null,
            2
        )
    );
}

// --------------------
// логи
// --------------------
console.log('Bot started');
console.log('Users loaded:', users.size);

bot.getMe()
    .then(me => {
        console.log('Bot connected:', me.username);
    })
    .catch(console.error);

bot.on('polling_error', error => {
    console.error('[polling_error]', error.message);
});

bot.on('error', error => {
    console.error('[error]', error);
});

// --------------------
// /start
// --------------------
bot.onText(/\/start/, msg => {

    const chatId = msg.chat.id;
    const userKey = String(chatId);

    users.add(chatId);

    if (userSums[userKey] === undefined) {
        userSums[userKey] = 0;
    }

    saveData();

    bot.sendMessage(
        chatId,
        'Введите стартовую сумму.'
    );
});

// --------------------
// /balance
// --------------------
bot.onText(/\/balance/, msg => {

    const chatId = msg.chat.id;
    const userKey = String(chatId);

    const balance =
        userSums[userKey] ?? 0;

    bot.sendMessage(
        chatId,
        `Текущий баланс: ${balance} BYN`
    );
});

// --------------------
// ввод суммы
// --------------------
bot.on('message', msg => {

    if (!msg.text) return;
    if (msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userKey = String(chatId);

    const amount = Number(msg.text);

    if (!Number.isNaN(amount)) {

        userSums[userKey] = amount;

        saveData();

        bot.sendMessage(
            chatId,
            `Текущая сумма: ${amount} BYN`
        );
    }
});

// --------------------
// тест: каждую минуту
// --------------------
cron.schedule('* * * * *', () => {

    console.log(
        'CRON RUN',
        new Date(),
        'users:',
        users.size
    );

    users.forEach(chatId => {

        bot.sendMessage(
            chatId,
            'Были на тренировке?',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Да',
                                callback_data: 'gym_yes'
                            },
                            {
                                text: 'Нет',
                                callback_data: 'gym_no'
                            }
                        ]
                    ]
                }
            }
        );

    });

});

// Для боевого режима потом верни:
// cron.schedule('30 10 * * 1,3,5,6', ..., {
//     timezone: 'Europe/Minsk'
// });

// --------------------
// кнопки
// --------------------
bot.on('callback_query', async query => {

    const chatId = query.message.chat.id;
    const userKey = String(chatId);

    try {

        switch (query.data) {

            case 'gym_yes':

                await bot.sendMessage(
                    chatId,
                    'Выберите стоимость тренировки',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: '-20 BYN',
                                        callback_data: 'minus20'
                                    }
                                ],
                                [
                                    {
                                        text: '-40 BYN',
                                        callback_data: 'minus40'
                                    }
                                ]
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

                if (typeof userSums[userKey] !== 'number') {

                    await bot.sendMessage(
                        chatId,
                        'Сначала введите стартовую сумму.'
                    );

                    break;
                }

                userSums[userKey] -= 20;

                saveData();

                await bot.sendMessage(
                    chatId,
                    `Списано: 20 BYN\nОстаток: ${userSums[userKey]} BYN`
                );

                break;

            case 'minus40':

                if (typeof userSums[userKey] !== 'number') {

                    await bot.sendMessage(
                        chatId,
                        'Сначала введите стартовую сумму.'
                    );

                    break;
                }

                userSums[userKey] -= 40;

                saveData();

                await bot.sendMessage(
                    chatId,
                    `Списано: 40 BYN\nОстаток: ${userSums[userKey]} BYN`
                );

                break;
        }

        await bot.answerCallbackQuery(query.id);

    } catch (error) {

        console.error(error);

        await bot.answerCallbackQuery(
            query.id,
            {
                text: 'Произошла ошибка'
            }
        );
    }
});