/** Product ids that have a real photograph thumbnail in assets/photos/thumbs/<id>.webp.
 * Client-supplied team photography (docs/PHOTOS.md) — a thumbnail is only attached where
 * the photograph genuinely shows that product; everything else falls back to the render. */
export const PHOTO_THUMBS = new Set([
  'genius-gi-black', 'genius-gi-white', 'genius-gi-blue',
  'core-ls-black', 'spats-black',
]);
