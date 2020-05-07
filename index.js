const { getAssetFromKV } = require('@cloudflare/kv-asset-handler');

async function getNotFoundAsset(event) {
  const url = new URL(event.request.url);

  const notFoundResponse = await getAssetFromKV(event, {
    mapRequestToAsset: (req) => new Request((new URL('/404.html', url.origin)).toString(), req),
  });

  return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
}

async function getAsset(event, routesManifest) {
  const url = new URL(event.request.url);
  const options = {};

  // If this is in the /_next/ folder than it can effectively be
  // cached forever since the next version will have new filenames.
  if (url.pathname.match(/^\/_next\/.*$/)) {
    options.cacheControl = {
      edgeTTL: 31536000, // 1 year
      browserTTL: 31556952, // 1 year
    };
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
        return await getAssetFromKV(event, {
          mapRequestToAsset: (req) => new Request((new URL(`${match.page}.html`, url.origin)).toString(), req),
        });
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
