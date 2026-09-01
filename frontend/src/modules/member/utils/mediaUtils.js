// Centralized Media & Placeholder Resolver for Member Social Posts

export const POST_IMAGE_PLACEHOLDERS = {
  ganesh_celebration: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800',
  blood_donation_banner: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
  rohit_upsc_success: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  rakesh_digital_services: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  health_camp_event: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
  matrimonial_meetup: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800',
  women_workshop_1: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800',
  women_workshop_2: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600',
  women_workshop_3: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600',
  youth_cricket: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
  youth_chess: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600'
};

/**
 * Resolves a post media identifier or URL to a valid image source.
 * Handles alias keys, relative backend paths, object structures, and fallbacks.
 */
export const resolvePostMediaUrl = (mediaInput) => {
  if (!mediaInput) return '';

  let rawUrl = '';
  if (typeof mediaInput === 'string') {
    rawUrl = mediaInput.trim();
  } else if (typeof mediaInput === 'object' && mediaInput !== null) {
    rawUrl = mediaInput.url || mediaInput.src || mediaInput.path || '';
  }

  if (!rawUrl) return '';

  // 1. Check known mock/seeded placeholder aliases
  if (POST_IMAGE_PLACEHOLDERS[rawUrl]) {
    return POST_IMAGE_PLACEHOLDERS[rawUrl];
  }

  // 2. If already an absolute HTTP(S) or Data URL, return directly
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:image/') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  // 3. Handle relative server paths (e.g. /uploads/...)
  const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const cleanBase = backendBase.replace(/\/api\/?$/, '');

  if (rawUrl.startsWith('/')) {
    return `${cleanBase}${rawUrl}`;
  }

  return `${cleanBase}/${rawUrl}`;
};

/**
 * Checks if a media string or URL points to a video.
 */
export const isMediaVideo = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lowercase = url.toLowerCase();
  return (
    lowercase.endsWith('.mp4') ||
    lowercase.endsWith('.webm') ||
    lowercase.endsWith('.ogg') ||
    lowercase.endsWith('.mov') ||
    lowercase.includes('youtube.com') ||
    lowercase.includes('youtu.be') ||
    lowercase.includes('instagram.com') ||
    lowercase.startsWith('data:video') ||
    lowercase.includes('/video/')
  );
};
