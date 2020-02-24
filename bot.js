const { Tarkov } = require('tarkov');

const t = new Tarkov(process.env.hwid);

const purchasedItems = [
  { id: '57347ca924597744596b4e71', name: 'видеокарта', max_price: 100000 },
  { id: '5c94bbff86f7747ee735c08f', name: 'лаб. ключ', max_price: 100000 },
  { id: '5c1d0efb86f7744baf2e7b7b', name: 'красная карта', max_price: 17000000 },
];

(async () => {
  await t.login(process.env.email, process.env.password);

  const profiles = await t.getProfiles();
  const profile = profiles.find((p) => p.savage);
  await t.selectProfile(profile);
  const roubles = t.profile.getRoubles();
  console.log(`> Привет ${profile.Info.Nickname}`);
  // console.log(`> Начальный баланс: ${t.profile.getRoubles()}`);

  await t.getI18n('ru');

  await setInterval(async () => {
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
        // eslint-disable-next-line no-await-in-loop
        const response = await offer.buyWithRoubles(offer.items.length);
        console.log(`> Найдена ${purchasedItem.name}: ${offer.requirementsCost}`);

        if (response.items.new) {
          console.log(`> Куплено: ${purchasedItem.name}. ${offer.items.length} шт.`);
        } else {
          console.log(`> Ошибка: ${response.badRequest[0].errmsg}`);
        }
      }
    }
  }, 1000);
})();
