export const MAX_IMAGE_COUNT = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const getPhotoSize = (photo) => {
  if (Number.isFinite(photo?.file?.size)) return photo.file.size;
  if (Number.isFinite(photo?.size)) return photo.size;

  const dataUrl = typeof photo === 'string' ? photo : photo?.dataUrl;
  if (typeof dataUrl !== 'string') return null;

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return null;

  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  if (metadata.endsWith(';base64')) {
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    return Math.floor((payload.length * 3) / 4) - padding;
  }

  try {
    return new TextEncoder().encode(decodeURIComponent(payload)).length;
  } catch {
    return new TextEncoder().encode(payload).length;
  }
};
