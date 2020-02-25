const { Tarkov } = require('tarkov');
const winston = require('winston');
const TelegramLogger = require('winston-telegram');

const t = new Tarkov(process.env.hwid);

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
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat,
    winston.format.colorize(),
  ),
  transports: [
    new winston.transports.Console(),
    new TelegramLogger({
      token: process.env.telegram_token,
      chatId: process.env.telegram_chat_id,
      level: 'info',
      disableNotification: true,
      template: '{message}',
    }),
  ],
});

const purchasedItems = [
  {
    id: '57347ca924597744596b4e71',
    name: 'видеокарта',
    max_price: 100000,
  },
  {
    id: '5c94bbff86f7747ee735c08f',
    name: 'лаб. ключ',
    max_price: 100000,
  },
  {
    id: '5c1d0efb86f7744baf2e7b7b',
    name: 'красная карта',
    max_price: 17000000,
  },
];

(async () => {
  await t.login(process.env.email, process.env.password);

  const profiles = await t.getProfiles();
  const profile = profiles.find((p) => p.savage);
  await t.selectProfile(profile);
  logger.debug(`Привет ${profile.Info.Nickname}`);

  await t.getI18n('ru');

  const timer = await setInterval(async () => {
    try {
      // eslint-disable-next-line no-restricted-syntax
      for (const purchasedItem of purchasedItems) {
        // eslint-disable-next-line no-await-in-loop
        const search = await t.searchMarket(0, 15, {
          currency: 1,
          priceTo: purchasedItem.max_price,
          handbookId: purchasedItem.id,
        });

        if (search.offers.length) {
          const offer = search.offers[0];
          logger.verbose(`Найдена ${purchasedItem.name}: ${offer.requirementsCost}`);
          // eslint-disable-next-line no-await-in-loop
          const response = await offer.buyWithRoubles(offer.items.length);

          if (response.items.new) {
            logger.info(`Куплено: ${purchasedItem.name}. ${offer.items.length} шт.`);
          } else {
            logger.debug(`Ошибка: ${response.badRequest[0].errmsg}`);
          }
        }
      }
    } catch (e) {
      logger.error('Произошла ошибка. Программа остановлена.');
      clearInterval(timer);
    }
  }, 1000);
})();
