/* eslint-disable no-underscore-dangle */
const Tarkov = require('tarkov');

const tarkov = new Tarkov();
(async () => {
  const itemShortName = 'Keycard'; // Keycard, Graphics card
  const maxPrice = 100000;
  // Check if launcherVersion is up-to-date
  const lv = await tarkov.checkLauncherVersion();
  console.log('>', lv);

  // Check if gameVersion is up-to-date
  const gv = await tarkov.checkGameVersion();
  console.log('>', gv);

  // Login with user, pw, hwid
  const t = await tarkov.login('',
    '',
    '',
    null);

  const profiles = await t.get_profiles();
  const profile = profiles.find((p) => p.info.side !== 'Savage');
  await t.select_profile(profile.id);
  console.log(`> Hello, ${profile.info.nickname}!`);

  await t.get_i18n('en');

  let roubles = await profile.getRoubles();
  console.log(`> Баланс  = ${roubles.amount} рублей`);

  const items = await t.get_items();
  const item = items.find((i) => i.props.shortname === itemShortName);
  console.log(`> ${itemShortName} id: ${item.id}`);

  const timer = await setInterval(async () => {
    try {
      const search = await t.search_market(0,
        15,
        {
          handbook_id: item.id,
          max_price: maxPrice,
          currency: 1,
        });

      if (search.offers.length > 0) {
        const itemPrice = search.offers[0].requirementsCost;
        console.log(`> Найдена ${itemShortName} с ценой: ${itemPrice}`);

        if (itemPrice <= roubles.amount) {
          const barterItems = [];
          const barterItem = roubles.stacks.find((i) => i.upd.StackObjectsCount >= itemPrice);
          if (barterItem) {
            barterItems.push({ id: barterItem._id, count: itemPrice });
          } else {
            let ammount = 0;
            roubles.stacks.filter((i) => i.upd.StackObjectsCount > 0).some((i) => {
              if (ammount + i.upd.StackObjectsCount <= itemPrice) {
                barterItems.push({ id: i._id, count: i.upd.StackObjectsCount });
                ammount += i.upd.StackObjectsCount;
              } else {
                const addedAmount = itemPrice - ammount;
                barterItems.push({ id: i._id, count: addedAmount });
                ammount += addedAmount;
              }
              return ammount === itemPrice;
            });
          }

          const buyedItem = await t.buy_item(search.offers[0]._id,
            1,
            barterItems);
          if (buyedItem.change || buyedItem.del) {
            if (buyedItem.change) await profile.updateItems(buyedItem.change);
            if (buyedItem.del) await profile.removeItems(buyedItem.del);
            console.log(`> Куплена ${itemShortName} за: ${itemPrice}`);
            roubles = await profile.getRoubles();
            console.log(`Рублей осталось: ${roubles.amount}`);
          } else {
            console.log(`> Не удалось купить ${itemShortName}. Ошибка: ${buyedItem.errmsg}`);
          }
        } else {
          console.log('> Цена превышает баланс аккаунта');
        }
      }
    } catch (e) {
      clearInterval(timer);
    }
  }, 2000);
})();
