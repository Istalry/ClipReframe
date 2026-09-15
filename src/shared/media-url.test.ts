import { fromMediaUrl, toMediaUrl } from './media-url';

describe('media url', () => {
  it('round-trips Windows paths with spaces, accents and hashes', () => {
    const path = 'C:\\Users\\Zoé\\Vidéos\\clip #1 (final).mp4';
    const url = toMediaUrl(path);
    expect(url.startsWith('media://local/')).toBe(true);
    expect(url).not.toContain(' ');
    expect(url).not.toContain('#');
    expect(fromMediaUrl(url)).toBe(path);
  });

  it('rejects foreign urls', () => {
    expect(() => fromMediaUrl('file:///C:/x.mp4')).toThrow();
  });
});
