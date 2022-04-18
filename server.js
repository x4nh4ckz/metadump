import { OpenSeaClient } from './fetcher/eth/index.js';
// Database integration
// import { Sequelize } from 'sequelize';
// const sequelize = new Sequelize('sqlite::memory:');
// running http server and socket.io on top of it
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
const PORT = 3080;
// local libs
import {
  generateWalletOpts,
  parseCollectibles
} from './collectibles.js';

const app = express();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, POST, DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send(utils.response(true, "up & healthy"));
});

let server = http.createServer(app);

server.listen(PORT, () => {
  console.log('SocketIO > Server listening on port: ' + PORT);
});

const io = new Server(server);

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
    console.log(`creds: ${JSON.stringify(opts)}`);
    if(!opts) return 'only eth and sol wallet types are currently supported';
    // const nfts = await fetchClient.getCollectibles(opts);
    const nfts = await OpenSeaClient.getAllCollectibles([data.wallet]);
    console.log(`fetched NFTs: ${JSON.stringify(nfts)}`);
    const collectibles = parseCollectibles(data.walletType, nfts);
    if(!collectibles) return 'there are no nfts attached to this type of wallet';
    console.log(`result: ${JSON.stringify(collectibles)}`);
    return collectibles;
  });
});
