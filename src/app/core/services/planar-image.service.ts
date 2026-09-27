import { Injectable } from '@angular/core';

/** The Cache Storage cache holding every card image shown so far (R12). */
export const PLANAR_IMAGE_CACHE = 'grm-planechase-images';

// Card images from Scryfall's image host, kept on the device once shown so they work offline in
// dev, in the PWA and on Android alike (FR-006, R12). There's no eviction: every image of every
// card tops out around 26 MB.
@Injectable({ providedIn: 'root' })
export class PlanarImageService {
  private readonly urls = new Map<string, Promise<string | null>>();

  /** An object URL for the image, or `null` when it can't be had (offline and never cached). */
  url(address: string): Promise<string | null> {
    let url = this.urls.get(address);
    if (!url) {
      url = this.resolve(address);
      this.urls.set(address, url);
      // A failure isn't remembered, so the image loads once the connection is back.
      void url.then((value) => {
        if (value === null) {
          this.urls.delete(address);
        }
      });
    }
    return url;
  }

  private async resolve(address: string): Promise<string | null> {
    try {
      const cache = typeof caches === 'undefined' ? null : await caches.open(PLANAR_IMAGE_CACHE);
      let response = await cache?.match(address);
      if (!response) {
        const fetched = await fetch(address, { mode: 'cors' });
        if (!fetched.ok) {
          return null;
        }
        response = fetched;
        await cache?.put(address, fetched.clone()).catch(() => undefined);
      }
      return URL.createObjectURL(await response.blob());
    } catch {
      return null;
    }
  }
}
