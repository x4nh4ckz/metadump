import fetch from 'node-fetch';

const OPENSEA_AUDIO_EXTENSIONS = ['mp3', 'wav', 'oga'];
const OPENSEA_VIDEO_EXTENSIONS = ['gltf', 'glb', 'webm', 'mp4', 'm4v', 'ogv', 'ogg', 'mov'];
const SUPPORTED_VIDEO_EXTENSIONS = ['webm', 'mp4', 'ogv', 'ogg', 'mov'];
const SUPPORTED_3D_EXTENSIONS = ['gltf', 'glb'];

const NON_IMAGE_EXTENSIONS = [
  ...OPENSEA_VIDEO_EXTENSIONS,
  ...OPENSEA_AUDIO_EXTENSIONS
];

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

const isAssetImage = (asset) => {
  return [
    asset.image_url,
    asset.image_original_url,
    asset.image_preview_url,
    asset.image_thumbnail_url
  ].some(url => url && NON_IMAGE_EXTENSIONS.every(ext => !url.endsWith(ext)));
};

const areUrlExtensionsSupportedForType = (asset, extensions) => {
  const {
    animation_url,
    animation_original_url,
    image_url,
    image_original_url,
    image_preview_url,
    image_thumbnail_url
  } = asset;
  return [
    animation_url || '',
    animation_original_url || '',
    image_url,
    image_original_url,
    image_preview_url,
    image_thumbnail_url
  ].some(url => url && extensions.some(ext => url.endsWith(ext)));
};

const isAssetVideo = (asset) => areUrlExtensionsSupportedForType(asset, SUPPORTED_VIDEO_EXTENSIONS);

const isAssetThreeDAndIncludesImage = (asset) => {
  return (
    areUrlExtensionsSupportedForType(asset, SUPPORTED_3D_EXTENSIONS) &&
    isAssetImage(asset)
  );
};

const isAssetGif = (asset) => {
  return !!(
    asset.image_url ? asset.image_url.endsWith('.gif') :
    asset.image_original_url ? asset.image_original_url.endsWith('.gif') :
    asset.image_preview_url ? asset.image_preview_url.endsWith('.gif') :
    asset.image_thumbnail_url ? asset.image_thumbnail_url.endsWith('.gif') : false
  );
};

export const isAssetValid = (asset) => {
  return (
    isAssetGif(asset) ||
    isAssetThreeDAndIncludesImage(asset) ||
    isAssetVideo(asset) ||
    isAssetImage(asset)
  );
};

export const assetToCollectible = async (asset) => {
  let mediaType = null;
  let frameUrl = null;
  let imageUrl = null;
  let videoUrl = null;
  let threeDUrl = null;
  let gifUrl = null;

  const { animation_url, animation_original_url } = asset;
  const imageUrls = [
    asset.image_url,
    asset.image_original_url,
    asset.image_preview_url,
    asset.image_thumbnail_url
  ];

  try {
    if (isAssetGif(asset)) {
      mediaType = 'GIF';
      frameUrl = null;
      gifUrl = imageUrls.find(url => url ? url.endsWith('.gif') : null);
    } else if (isAssetThreeDAndIncludesImage(asset)) {
      mediaType = 'THREE_D';
      threeDUrl = [animation_url, animation_original_url, ...imageUrls].find(
        url => url && SUPPORTED_3D_EXTENSIONS.some(ext => url.endsWith(ext))
      );
      frameUrl = imageUrls.find(
        url => url && NON_IMAGE_EXTENSIONS.every(ext => !url.endsWith(ext))
      );
      const res = await fetch(frameUrl, { method: 'HEAD' });
      const hasGifFrame = res.headers.get('Content-Type') ? res.headers.get('Content-Type').includes('gif') : false;
      if (hasGifFrame) {
        gifUrl = frameUrl;
        frameUrl = null;
      }
    } else if (isAssetVideo(asset)) {
      mediaType = 'VIDEO'
      frameUrl = imageUrls.find(url => url && NON_IMAGE_EXTENSIONS.every(ext => !url.endsWith(ext))) || null;
      if (frameUrl) {
        const res = await fetch(frameUrl, { method: 'HEAD' })
        const isVideo = res.headers.get('Content-Type') ? res.headers.get('Content-Type').includes('video') : false;
        const isGif = res.headers.get('Content-Type') ? res.headers.get('Content-Type').includes('gif') : false;
        if (isVideo || isGif) {
          frameUrl = null;
        }
      }
      videoUrl = [animation_url, animation_original_url, ...imageUrls].find(url => url && SUPPORTED_VIDEO_EXTENSIONS.some(ext => url.endsWith(ext)));
    } else {
      mediaType = 'IMAGE';
      frameUrl = imageUrls.find(url => !!url);
      const res = await fetch(frameUrl, { method: 'HEAD' });
      const isGif = res.headers.get('Content-Type') ? res.headers.get('Content-Type').includes('gif') : false;
      const isVideo = res.headers.get('Content-Type') ? res.headers.get('Content-Type').includes('video') : false;
      if (isGif) {
        mediaType = 'GIF';
        gifUrl = frameUrl;
        frameUrl = null;
      } else if (isVideo) {
        mediaType = 'VIDEO';
        frameUrl = null;
        videoUrl = imageUrls.find(url => !!url);
      } else {
        imageUrl = imageUrls.find(url => !!url);
      }
    }
  } catch (e) {
    console.error('Error processing collectible', e);
    mediaType = 'IMAGE';
    frameUrl = imageUrls.find(url => !!url);
    imageUrl = frameUrl;
  };

  return {
    id: `${asset.token_id}:::${asset.asset_contract ? asset.asset_contract.address : ''}`,
    tokenId: asset.token_id,
    name: (asset.name || asset.asset_contract ? asset.asset_contract.name : '') || '',
    description: asset.description,
    mediaType,
    frameUrl,
    imageUrl,
    videoUrl,
    threeDUrl,
    gifUrl,
    isOwned: true,
    dateCreated: null,
    dateLastTransferred: null,
    externalLink: asset.external_link,
    permaLink: asset.permalink,
    assetContractAddress: asset.asset_contract ? asset.asset_contract.address : null,
    chain: 'eth',
    wallet: asset.wallet
  };
};

export const creationEventToCollectible = async (event) => {
  const { asset, created_date } = event;
  const collectible = await assetToCollectible(asset);
  return {
    ...collectible,
    dateCreated: created_date,
    isOwned: false
  };
};

export const transferEventToCollectible = async (event, isOwned) => {
  const { asset, created_date } = event;
  const collectible = await assetToCollectible(asset);
  return {
    ...collectible,
    isOwned: isOwned || true,
    dateLastTransferred: created_date
  };
};

export const isFromNullAddress = (event) => event.from_account.address === NULL_ADDRESS;