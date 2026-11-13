/**
 * Ask the image CDN for a copy sized for where it is shown, instead of the
 * full upload. Unsplash and Cloudinary resize on the fly; any other URL
 * (local files, data: URIs, other hosts) is returned unchanged.
 */
export const optimizeImage = (url, width = 800) => {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', '70');
      u.searchParams.set('auto', 'format');
      if (!u.searchParams.has('fit')) u.searchParams.set('fit', 'crop');
      return u.toString();
    } catch {
      return url;
    }
  }

  // https://res.cloudinary.com/<cloud>/image/upload/<...> → insert transforms once
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/') && !url.includes('/upload/f_auto')) {
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
  }

  return url;
};
