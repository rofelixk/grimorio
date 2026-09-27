import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLANAR_IMAGE_CACHE, PlanarImageService } from './planar-image.service';

describe('PlanarImageService', () => {
  const stored = new Map<string, Response>();
  let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
  let open: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let objectUrls = 0;
  let service: PlanarImageService;

  beforeEach(() => {
    stored.clear();
    objectUrls = 0;
    cache = {
      match: vi.fn(async (address: string) => stored.get(address)?.clone()),
      put: vi.fn(async (address: string, response: Response) => void stored.set(address, response)),
    };
    open = vi.fn().mockResolvedValue(cache);
    fetchMock = vi.fn(async () => new Response(new Blob(['img']), { status: 200 }));
    vi.stubGlobal('caches', { open });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++objectUrls}`);
    service = TestBed.inject(PlanarImageService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches a miss with CORS, caches it and returns an object URL', async () => {
    expect(await service.url('https://img.test/a.jpg')).toBe('blob:1');
    expect(open).toHaveBeenCalledWith(PLANAR_IMAGE_CACHE);
    expect(fetchMock).toHaveBeenCalledWith('https://img.test/a.jpg', { mode: 'cors' });
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(stored.has('https://img.test/a.jpg')).toBe(true);
  });

  it('serves a hit from the cache without the network', async () => {
    stored.set('https://img.test/b.jpg', new Response(new Blob(['cached'])));
    expect(await service.url('https://img.test/b.jpg')).toBe('blob:1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('memoizes the object URL per address for the session', async () => {
    const [first, second] = await Promise.all([service.url('https://img.test/c.jpg'), service.url('https://img.test/c.jpg')]);
    expect(first).toBe(second);
    expect(await service.url('https://img.test/c.jpg')).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when offline and uncached, and retries next time', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await service.url('https://img.test/d.jpg')).toBeNull();
    expect(await service.url('https://img.test/d.jpg')).toBe('blob:1');
  });

  it('returns null for a failed response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await service.url('https://img.test/e.jpg')).toBeNull();
    expect(cache.put).not.toHaveBeenCalled();
  });
});
