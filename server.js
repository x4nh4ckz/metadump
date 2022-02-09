import { OpenSeaClient } from './fetcher/eth/index.js';
// Database integration
// import { Sequelize } from 'sequelize';
// const sequelize = new Sequelize('sqlite::memory:');
// running http server and socket.io on top of it
import { createServer } from 'http';
import { Server } from 'socket.io';
const httpServer = createServer();
const io = new Server(httpServer);
const port = 3080;
// local libs
import {
  generateWalletOpts,
  parseCollectibles
} from './collectibles.js';

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', (data) => {
    console.log('a user disconnected');
  });

  socket.on('signup', (data) => {
    console.log(`${data} trying to sign up...`);
  });

  socket.on('authorize', (data) => {
    console.log(`${data} authorized`);
  });

  socket.on('getNFTs', async (data) => {
    const opts = generateWalletOpts(data.walletType, data.wallet);
    if(!opts) return 'only eth and sol wallet types are currently supported';
    // const nfts = await fetchClient.getCollectibles(opts);
    const nfts = await OpenSeaClient.getAllCollectibles([data.wallet]);
    const collectibles = parseCollectibles(data.walletType, nfts);
    if(!collectibles) return 'there are no nfts attached to this type of wallet';
    console.log(collectibles);
    return collectibles;
  });
});

httpServer.listen(port, 'localhost');