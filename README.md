next-cloudflare
==================================
Utilities for hosting static Next.js site on Cloudflare Workers Sites.

**NOTE** This only works with static Next.js sites. It does **not** support server-side rendering or API routes. See zeit/next.js#11326

## Installation
```sh
npm install --save @cinematix/next-cloudflare
```

## Quick Start
From a new or existing [Workers Site](https://developers.cloudflare.com/workers/sites) create a handler like this:
```javascript
import { getEventHandler } from '@cinematix/next-cloudflare';
import routesManifest from './.next/routes-manifest.json';

const handleEvent = getEventHandler(routesManifest);

addEventListener('fetch', handleEvent);
```
Before building the worker, be sure to run `npx next build && npx next export` to generate the routes manifest. Alternatively, add a script like this to your `package.json`:
```json
{
  "scripts": {
    "build": "next build && next export && wrangler publish"
  }
}
```

## API
```javascript
getEventHandler(routesManifest: object): function(event: Event) : void
```
Returns an event handler for the `fetch` event in a Cloudflare Worker. Uses `event.respondWith()` to handle the event.

```javascript
getAsset(event: Event, routesManifest?: object): Promise<Response>
```
Returns the KV Asset based on the route. Resolves any dynamic routes and not found routes from the routesManifest.

```javascript
getNotFoundAsset(event: Event): Promise<Response>
```
Returns the KV Asset for the `404.html` page.
