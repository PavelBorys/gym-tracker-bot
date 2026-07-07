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
let history = {};
let users = new Set();

// --------------------
// загрузка данных
// --------------------
if (fs.existsSync(DATA_FILE)) {
try {

```
    const data = JSON.parse(
        fs.readFileSync(DATA_FILE, 'utf8')
    );

    userSums = data.userSums || {};
    history = data.history || {};
    users = new Set(data.users || []);

} catch (e) {

    console.error('Load error:', e);

    userSums = {};
    history = {};
    users = new Set();
}
```

}

// --------------------
// сохранение данных
// --------------------
function saveData() {

```
fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
        {
            userSums,
            history,
            users: Array.from(users)
        },
        null,
        2
    )
);
```

}

// --------------------
// вывод истории
// --------------------
function showHistory(chatId, userKey) {

```
const records = history[userKey] || [];

if (records.length === 0) {

    return bot.sendMessage(
        chatId,
        'История тренировок пуста.'
    );
}

let total = 0;

let text =
    '📅 История тренировок\n\n';

records.forEach(item => {

    total += item.amount;

    const date = new Date(item.date)
        .toLocaleDateString('ru-RU');

    text += `${date} — ${item.amount} BYN\n`;
});

text +=
    `\n🏋️ Тренировок: ${records.length}` +
    `\n💸 Всего списано: ${total} BYN` +
    `\n💰 Остаток: ${userSums[userKey] ?? 0} BYN`;

return bot.sendMessage(chatId, text);
```

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
bot.onText(//start/, msg => {

```
const chatId = msg.chat.id;
const userKey = String(chatId);

users.add(chatId);

if (userSums[userKey] === undefined) {
    userSums[userKey] = 0;
}

saveData();

bot.sendMessage(
    chatId,
    'Введите стартовую сумму.',
    {
        reply_markup: {
            keyboard: [
                ['💰 Баланс'],
                ['📅 История']
            ],
            resize_keyboard: true
        }
    }
);
```

});

// --------------------
// /balance
// --------------------
bot.onText(//balance/, msg => {

```
const chatId = msg.chat.id;
const userKey = String(chatId);

const balance =
    userSums[userKey] ?? 0;

bot.sendMessage(
    chatId,
    `Текущий баланс: ${balance} BYN`
);
```

});

// --------------------
// /history
// --------------------
bot.onText(//history/, msg => {

```
const chatId = msg.chat.id;
const userKey = String(chatId);

showHistory(chatId, userKey);
```

});

// --------------------
// ввод сообщений
// --------------------
bot.on('message', msg => {

```
if (!msg.text) return;
if (msg.text.startsWith('/')) return;

const chatId = msg.chat.id;
const userKey = String(chatId);

if (msg.text === '💰 Баланс') {

    const balance =
        userSums[userKey] ?? 0;

    return bot.sendMessage(
        chatId,
        `Текущий баланс: ${balance} BYN`
    );
}

if (msg.text === '📅 История') {

    return showHistory(chatId, userKey);
}

const amount = Number(msg.text);

if (!Number.isNaN(amount)) {

    userSums[userKey] = amount;

    // новая сумма = новая история
    history[userKey] = [];

    saveData();

    return bot.sendMessage(
        chatId,
        `Текущая сумма: ${amount} BYN`
    );
}
```

});

// --------------------
// Пн, Ср, Пт, Сб — 10:30
// --------------------
cron.schedule('30 10 * * 1,3,5,6', () => {

```
console.log('Morning reminder');

sendTrainingQuestion();
```

}, {
timezone: 'Europe/Minsk'
});

// --------------------
// Вт, Ср, Чт, Пт — 17:00
// --------------------
cron.schedule('0 17 * * 2,3,4,5', () => {

```
console.log('Evening reminder');

sendTrainingQuestion();
```

}, {
timezone: 'Europe/Minsk'
});

// --------------------
// отправка вопроса
// --------------------
function sendTrainingQuestion() {

```
console.log(
    'Sending reminders. Users:',
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
```

}

// --------------------
// кнопки
// --------------------
bot.on('callback_query', async query => {

```
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

            if (!history[userKey]) {
                history[userKey] = [];
            }

            history[userKey].push({
                date: new Date().toISOString(),
                amount: 20
            });

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

            if (!history[userKey]) {
                history[userKey] = [];
            }

            history[userKey].push({
                date: new Date().toISOString(),
                amount: 40
            });

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
```

});
