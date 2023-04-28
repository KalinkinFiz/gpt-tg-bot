import { Telegraf, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import config from 'config';

import { ogg } from './ogg.js';
import { openai } from './openai.js';

const INITIAL_SESSION = {
    messages: [],
};

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session());

bot.command('new', (ctx) => {
    ctx.session = INITIAL_SESSION;
    ctx.reply('Жду вашего голосового или текстового сообщения ...');
});

bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION;

    const welcomeMessage = 'Жду вашего голосового или текстового сообщения ...'
    const commands = [['/new'], ['/help']];

    await ctx.reply(welcomeMessage, Markup.keyboard(commands).resize());
});

bot.command('help', async (ctx) => {
    const helpMessage =
        'Привет! Я бот, который предоставляет возможность общаться с чатом GPT посредством голоса или ввода текста и сохраняю контекст.\n' +
        'Вот, что я могу: \n\n' +
        '/help - получить список команд\n' +
        '/new - создание нового диалога\n';

    await ctx.reply(helpMessage);
});

bot.on(message('voice'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION; // undefined or null
    try {
        await ctx.reply(code('Сообщение принято. Жду ответ от сервера ...'));
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const uesrId = String(ctx.message.from.id);
        const oggPath = await ogg.create(link.href, uesrId);
        const mp3Path = await ogg.toMp3(oggPath, uesrId);

        const text = await openai.transcription(mp3Path);
        await ctx.reply(code(`Ваш запрос: ${text}`));

        ctx.session.messages.push({ role: openai.roles.USER, content: text });

        const response = await openai.chat(ctx.session.messages);

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.content,
        });

        await ctx.reply(response.content);
    } catch (e) {
        console.log(`Error while voice message`, e.message);
    }
});

bot.on(message('text'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION; // undefined or null
    try {
        await ctx.reply(code('Сообщение принято. Жду ответ от сервера ...'));

        ctx.session.messages.push({
            role: openai.roles.USER,
            content: ctx.message.text,
        });

        const response = await openai.chat(ctx.session.messages);

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.content,
        });

        await ctx.reply(response.content);
    } catch (e) {
        console.log(`Error while text message`, e.message);
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
