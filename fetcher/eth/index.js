import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import {
  isAssetValid,
  assetToCollectible,
  creationEventToCollectible,
  transferEventToCollectible,
  isFromNullAddress
} from './helpers.js';

const OSEA_API = 'https://api.opensea.io/api/v1';

const parseAssetEventResults = (results, wallets) => {
  return results
    .map((result, i) => ({ result, wallet: wallets[i] }))
    .filter(({ result }) => result.status === 'fulfilled')
    .map(
      ({ result, wallet }) => result.value.asset_events ? result.value.asset_events.map(event => ({
        ...event,
        asset: {
          ...event.asset,
          wallet
        },
        wallet
      })) : []
    )
    .flat();
};

const parseAssetResults = (results, wallets) => {
  return results
    .map((result, i) => ({ result, wallet: wallets[i] }))
    .filter(({ result }) => result.status === 'fulfilled')
    .map(({ result, wallet }) => result.value.assets ? result.value.assets.map(asset => ({ ...asset, wallet })) : [])
    .flat();
};

export const OpenSeaClientProps = {
  apiEndpoint: '',
  apiKey: '',
  assetLimit: 0,
  eventLimit: 0
};

export const OpenSeaClient = {
  url: OSEA_API,
  apiKey: '',
  assetLimit: 50,
  eventLimit: 300,
  getTransferredCollectiblesForWallet: async function(wallet, limit = 50) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
      dumpio: false
    });
    const [page] = await browser.pages();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en'
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36');
    await page.goto(`${this.url}/events?account_address=${wallet}&limit=${limit}&event_type=transfer&only_opensea=false`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'testresult.png', fullPage: true });
    const innerText = await page.evaluate(() =>  {
        return JSON.parse(document.querySelector('body').innerText); 
    }); 
    await browser.close();
    return innerText;
  },
  getTransferredCollectiblesForMultipleWallets: async function(wallets, limit = 50) {
    return Promise.allSettled(
      wallets.map(wallet => this.getTransferredCollectiblesForWallet(wallet, limit))
    ).then(results => parseAssetEventResults(results, wallets))
  },
  getCreatedCollectiblesForWallet: async function(wallet, limit = 50) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
      dumpio: false
    });
    const [page] = await browser.pages();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en'
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36');
    await page.goto(`${this.url}/events?account_address=${wallet}&limit=${limit}&event_type=created&only_opensea=false`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'testresult.png', fullPage: true });
    const innerText = await page.evaluate(() =>  {
        return JSON.parse(document.querySelector('body').innerText); 
    }); 
    await browser.close();
    return innerText;
  },
  getCreatedCollectiblesForMultipleWallets: async function(wallets, limit = 50) {
    return Promise.allSettled(
      wallets.map(wallet => this.getCreatedCollectiblesForWallet(wallet, limit))
    ).then(results => parseAssetEventResults(results, wallets))
  },
  getCollectiblesForWallet: async function(wallet, limit = 50) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
      dumpio: false
    });
    const [page] = await browser.pages();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en'
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36');
    await page.goto(`https://api.opensea.io/api/v1/assets?format=json&owner=${wallet}&limit=${limit}`);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'testresult.png', fullPage: true });
    const innerText = await page.evaluate(() =>  {
        return JSON.parse(document.querySelector('body').innerText); 
    }); 
    await browser.close();
    return innerText;
  },
  getCollectiblesForMultipleWallets: async function(wallets, limit = 50) {
    return Promise.allSettled(
      wallets.map(wallet => this.getCollectiblesForWallet(wallet, limit))
    ).then(results => parseAssetResults(results, wallets))
  },
  getAllCollectibles: async function(wallets) {
    return Promise.all([
      this.getCollectiblesForMultipleWallets(wallets),
      this.getCreatedCollectiblesForMultipleWallets(wallets),
      this.getTransferredCollectiblesForMultipleWallets(wallets)
    ]).then(async ([assets, creationEvents, transferEvents]) => {
      const filteredAssets = assets.filter(
        asset => asset && isAssetValid(asset)
      )
      const collectibles = await Promise.all(
        filteredAssets.map(async asset => await assetToCollectible(asset))
      )
      const collectiblesMap = collectibles.reduce((acc, curr) => ({
        ...acc,
        [curr.id]: curr
      }), {});
      const ownedCollectibleKeySet = new Set(Object.keys(collectiblesMap))
      // Handle transfers from NullAddress as if they were created events
      const firstOwnershipTransferEvents = transferEvents
        .filter(
          event =>
            event?.asset &&
            isAssetValid(event.asset) &&
            isFromNullAddress(event)
        )
        .reduce((acc, curr) => {
          const { token_id, asset_contract } = curr.asset;
          const id = `${token_id}:::${asset_contract ? asset_contract.address : ''}`;
          if (acc[id] && acc[id].created_date.localeCompare(curr.created_date) > 0) return acc;
          return { ...acc, [id]: curr };
        }, {});
      await Promise.all(
        Object.entries(firstOwnershipTransferEvents).map(async entry => {
          const [id, event] = entry
          if (ownedCollectibleKeySet.has(id)) {
            collectiblesMap[id] = {
              ...collectiblesMap[id],
              dateLastTransferred: event.created_date
            }
          } else {
            ownedCollectibleKeySet.add(id)
            collectiblesMap[id] = await transferEventToCollectible(event, false)
          }
          return event
        })
      )
      // Handle created events
      await Promise.all(
        creationEvents
          .filter(event => event?.asset && isAssetValid(event.asset))
          .map(async event => {
            const { token_id, asset_contract } = event.asset
            const id = `${token_id}:::${asset_contract?.address ?? ''}`
            if (!ownedCollectibleKeySet.has(id)) {
              collectiblesMap[id] = await creationEventToCollectible(event)
              ownedCollectibleKeySet.add(id)
            }
            return event
          })
      )
      // Handle transfers
      const latestTransferEventsMap = transferEvents
        .filter(
          event =>
            event?.asset &&
            isAssetValid(event.asset) &&
            !isFromNullAddress(event)
        )
        .reduce((acc, curr) => {
          const { token_id, asset_contract } = curr.asset
          const id = `${token_id}:::${asset_contract?.address ?? ''}`
          if (
            acc[id] &&
            acc[id].created_date.localeCompare(curr.created_date) > 0
          ) {
            return acc
          }
          return { ...acc, [id]: curr }
        }, {})
      await Promise.all(
        Object.values(latestTransferEventsMap).map(async event => {
          const { token_id, asset_contract } = event.asset
          const id = `${token_id}:::${asset_contract?.address ?? ''}`
          if (ownedCollectibleKeySet.has(id)) {
            collectiblesMap[id] = {
              ...collectiblesMap[id],
              dateLastTransferred: event.created_date
            }
          } else if (wallets.includes(event.to_account.address)) {
            ownedCollectibleKeySet.add(id)
            collectiblesMap[id] = await transferEventToCollectible(event)
          }
          return event
        })
      )
      return Object.values(collectiblesMap).reduce(
        (result, collectible) => ({
          ...result,
          [collectible.wallet]: (result[collectible.wallet] || []).concat([
            collectible
          ])
        }),
        {}
      )
    })
  }
}