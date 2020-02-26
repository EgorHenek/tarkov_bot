const { Tarkov } = require('tarkov');
const winston = require('winston');
const TelegramLogger = require('winston-telegram');
const purchasedItems = require('./items');

const t = new Tarkov(process.env.hwid);

(async () => {
  const logFormat = winston.format.printf(({
    level, message, label, timestamp,
  }) => {
    if (label) {
      return `${timestamp} [${label}] ${level}: ${message}`;
    }
    return `${timestamp} ${level}: ${message}`;
  });

  const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.sss',
      }),
      logFormat,
      winston.format.colorize(),
    ),
    transports: [
      new winston.transports.Console(),
    ],
  });

  if (process.env.telegram_token && process.env.telegram_chat_id) {
    logger.add(new TelegramLogger({
      token: process.env.telegram_token,
      chatId: process.env.telegram_chat_id,
      level: 'info',
      disableNotification: true,
      template: '{message}',
    }));
  }

  await t.login(process.env.email, process.env.password).then(async () => {
    const profiles = await t.getProfiles();
    const profile = profiles.find((p) => p.savage);
    await t.selectProfile(profile);
    logger.debug(`Привет ${profile.Info.Nickname}`);

    await t.getI18n('ru');

    async function buy() {
      const rand = Math.floor(Math.random() * (1500 - 750 + 1) + 750);
      // eslint-disable-next-line no-restricted-syntax
      for (const purchasedItem of purchasedItems) {
        // eslint-disable-next-line no-await-in-loop
        await t.searchMarket(0, 15, {
          currency: 1,
          priceTo: purchasedItem.max_price,
          handbookId: purchasedItem.id,
        }).then(async (search) => {
          logger.info(`Запрос на поиск ${purchasedItem.name}. rand=${rand}`);
          if (search.offers.length) {
            const offer = search.offers[0];
            logger.verbose(`Найдена ${purchasedItem.name}: ${offer.requirementsCost}`);
            await offer.buyWithRoubles(offer.items.length).then((response) => {
              if (response.items.new) {
                logger.info(`Куплено: ${purchasedItem.name}. ${offer.items.length} шт. Стоимость: ${offer.requirementsCost}`);
              } else {
                logger.debug(`Ошибка: ${response.badRequest[0].errmsg}`);
              }
            }).catch(async (e) => {
              await logger.error(`Работа завершена. Ошибка: ${e.message}`);
              process.exit(1);
            });
          }
        })
          .catch(async (e) => {
            await logger.error(`Работа завершена. Ошибка: ${e.message}`);
            process.exit(1);
          });
      }
      await setTimeout(buy, rand);
    }
    await buy();
  })
    .catch(async (e) => {
      await logger.error(`Ошибка авторизации: ${e.errmsg}`);
      process.exit(1);
    });
})();
