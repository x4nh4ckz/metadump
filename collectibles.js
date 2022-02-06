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
        return parseCollecitons(nfts.ethCollectibles);
      case 'sol':
        return parseCollecitons(nfts.solCollectibles);
      default:
        return null;
    }
  }
  
  export const parseCollecitons = (obj) => {
    let collections = [];
    for (const [_, value] of Object.entries(obj)) {
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