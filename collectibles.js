export const generateWalletOpts = (walletType, wallet) => {
    const opts = {};
    switch(walletType) {
      case 'eth':
        opts.ethWallets = [wallet];
        break;
      case 'sol':
        opts.solWallets = [wallet];
        break;
      default:
        return null;
    }
    return opts;
  }
  
  export const parseCollectibles = (walletType, nfts) => {
    switch(walletType) {
      case 'eth':
        return parseCollecitons(nfts);
      case 'sol':
        return parseCollecitons(nfts);
      default:
        return null;
    }
  }
  
  const parseCollecitons = (obj) => {
    console.log(obj);
    let collections = [];
    for (const [_, value] of Object.entries(obj)) {
      console.log(value);
      for (const collection of value) {
        collections.push({
          name: collection.name,
          description: collection.description,
          linkToProject: collection.externalLink,
          linkToMedia: collection.frameUrl,
        });
      }
    }
    return collections;
  }