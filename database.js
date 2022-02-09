const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');

export const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  wallet: {
    type: DataTypes.STRING,
    allowNull: false
  },
  verifiedEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verifiedWallet: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

export const NFT = sequelize.define('NFT', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  linkToProject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  linkToMedia: {
    type: DataTypes.STRING,
    allowNull: false
  },
  origin: {
    type: DataTypes.STRING,
    allowNull: false
  },
  owner: {
    type: DataTypes.STRING, // wallet address
    allowNull: false
  }
});