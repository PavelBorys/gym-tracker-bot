const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

const token = '8386533677:AAGGM1njDVksuoPOGFnn7P0Raw0_HAg18co';

const bot = new TelegramBot(token, {
    polling: true
});

// Пользователи
const users = new Set();

// Балансы
const userSums = {};

bot.onText(/\/start/, (msg) => {

    const chatId = msg.chat.id;

    users.add(chatId);

    if (!userSums[chatId]) {
        userSums[chatId] = 0;
    }

    bot.sendMessage(
        chatId,
        'Введите стартовую сумму.'
    );
});

bot.on('message', (msg) => {

    if (!msg.text) return;
    if (msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;

    if (!isNaN(msg.text)) {

        userSums[chatId] = Number(msg.text);

        bot.sendMessage(
            chatId,
            `Текущая сумма: ${userSums[chatId]} BYN`
        );
    }
});

// Понедельник, среда, пятница, суббота в 10:30
cron.schedule('30 10 * * 1,3,5,6', () => {

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

}, {
    timezone: 'Europe/Minsk'
});

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
                            [
                                {
                                    text: '-20 рублей',
                                    callback_data: 'minus20'
                                }
                            ],
                            [
                                {
                                    text: '-40 рублей',
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

    userSums[chatId] -= 20;

    await bot.sendMessage(
        chatId,
        `Списано: 20\nОстаток: $${userSums[chatId]} BYN`
    );

    break;

case 'minus40':

    userSums[chatId] -= 40;

    await bot.sendMessage(
        chatId,
        `Списано: $40\nОстаток: ${userSums[chatId]} BYN`
    );

    break;
    }

    bot.answerCallbackQuery(query.id);

});