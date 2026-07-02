Заменить в коде:

1. После строки:

let userSums = {};
let users = new Set();

добавить:

let history = {};

2. В блоке загрузки данных заменить:

userSums = data.userSums || {};
users = new Set(data.users || []);

на:

userSums = data.userSums || {};
history = data.history || {};
users = new Set(data.users || []);

3. В функции saveData заменить объект на:

{
userSums,
history,
users: Array.from(users)
}

4. В обработчике /start заменить bot.sendMessage(...) на:

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

5. После обработчика /balance добавить:

bot.onText(//history/, msg => {

```
const chatId = msg.chat.id;
const userKey = String(chatId);

const records = history[userKey] || [];

if (records.length === 0) {

    bot.sendMessage(
        chatId,
        'История тренировок пуста.'
    );

    return;
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

bot.sendMessage(chatId, text);
```

});

6. В обработчике сообщений перед закрывающей скобкой блока if (!Number.isNaN(amount)) добавить:

history[userKey] = [];

7. В обработчике сообщений после блока с вводом суммы добавить:

if (msg.text === '💰 Баланс') {

```
const balance =
    userSums[userKey] ?? 0;

return bot.sendMessage(
    chatId,
    `Текущий баланс: ${balance} BYN`
);
```

}

if (msg.text === '📅 История') {

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

8. В обработчике minus20 после строки:

userSums[userKey] -= 20;

добавить:

if (!history[userKey]) {
history[userKey] = [];
}

history[userKey].push({
date: new Date().toISOString(),
amount: 20
});

9. В обработчике minus40 после строки:

userSums[userKey] -= 40;

добавить:

if (!history[userKey]) {
history[userKey] = [];
}

history[userKey].push({
date: new Date().toISOString(),
amount: 40
});
