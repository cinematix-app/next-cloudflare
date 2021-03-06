const { getAssetFromKV } = require('@cloudflare/kv-asset-handler');

async function getNotFoundAsset(event) {
  const url = new URL(event.request.url);

  const notFoundUrl = new URL('/404.html', url.origin);
  const asset = await getAssetFromKV(event, {
    mapRequestToAsset: (req) => new Request(notFoundUrl.toString(), req),
  });

  asset.headers.set('Content-Location', notFoundUrl.toString());

  return new Response(asset.body, { ...asset, status: 404 });
}

async function getAsset(event, routesManifest) {
  const url = new URL(event.request.url);
  const options = {};

  const { pathname } = url;

  // If this is in the /_next/ folder than it can effectively be
  // cached forever since the next version will have new filenames.
  if (pathname.match(/^\/_next\/.*$/)) {
    options.cacheControl = {
      edgeTTL: 31536000, // 1 year
      browserTTL: 31556952, // 1 year
    };
  }

  // If the pathname does not end with '/' and there is not an extension, then add the html
  // extension to the path.
  if (!pathname.endsWith('/')) {
    const filename = pathname.split('/').pop();
    // @see https://stackoverflow.com/a/12900504
    // eslint-disable-next-line no-bitwise
    const extension = filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    if (extension === '') {
      options.mapRequestToAsset = (req) => {
        const u = new URL(req.url);
        u.pathname += '.html';
        return new Request(u, req);
      };
    }
  }


  try {
    return await getAssetFromKV(event, options);
  } catch (e) {
    if (!routesManifest || !Array.isArray(routesManifest.dynamicRoutes)) {
      throw e;
    }

    const match = routesManifest.dynamicRoutes.find(({ regex }) => (url.pathname.match(regex)));

    if (match) {
      try {
        const matchUrl = new URL(`${match.page}.html`, url.origin);
        const asset = await getAssetFromKV(event, {
          mapRequestToAsset: (req) => new Request(matchUrl.toString(), req),
        });
        asset.headers.set('Content-Location', matchUrl.toString());
        return asset;
      } catch (error) {
        if (!routesManifest.pages404) {
          throw error;
        }

        return getNotFoundAsset(url, event);
      }
    }

    if (!routesManifest.pages404) {
      throw e;
    }

    return getNotFoundAsset(url, event);
  }
}

function getEventHandler(routesManifest) {
  return (event) => {
    event.respondWith(getAsset(event, routesManifest));
  };
}

module.exports = {
  getNotFoundAsset,
  getAsset,
  getEventHandler,
};
