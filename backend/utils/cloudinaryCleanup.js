const { cloudinary } = require('../config/cloudinary');

const publicIdFromUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname !== 'res.cloudinary.com') return null;

    const pathname = url.pathname;
    if (!pathname.includes('/image/upload/')) return null;
    const uploadMarker = '/upload/';
    const uploadIndex = pathname.indexOf(uploadMarker);
    if (uploadIndex === -1) return null;

    const segments = pathname.slice(uploadIndex + uploadMarker.length).split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex !== -1) {
      segments.splice(0, versionIndex + 1);
    }

    if (segments.length === 0) return null;
    segments[segments.length - 1] = segments[segments.length - 1].replace(/\.[^.]+$/, '');
    return segments.join('/') || null;
  } catch {
    return null;
  }
};

const publicIdFromImage = (image) => {
  if (typeof image === 'string') {
    if (/^https?:\/\//i.test(image)) return publicIdFromUrl(image);
    return image.trim() || null;
  }

  if (!image || typeof image !== 'object') return null;
  if (typeof image.public_id === 'string' && image.public_id.trim()) {
    return image.public_id.trim();
  }
  if (typeof image.publicId === 'string' && image.publicId.trim()) {
    return image.publicId.trim();
  }

  const url = image.secure_url || image.url;
  return typeof url === 'string' ? publicIdFromUrl(url) : null;
};

const getImageEntries = (images) => {
  if (Array.isArray(images)) return images;
  return images === undefined || images === null ? [] : [images];
};

const getPublicIds = (images) => getImageEntries(images)
  .map(publicIdFromImage)
  .filter(Boolean);

const classifyImage = (image) => {
  try {
    let value;
    let isPublicIdObject = false;
    if (typeof image === 'string') {
      value = image.trim();
    } else if (image && typeof image === 'object') {
      isPublicIdObject = true;
      if (typeof image.public_id === 'string' && image.public_id.trim()) {
        value = image.public_id.trim();
      } else if (typeof image.publicId === 'string' && image.publicId.trim()) {
        value = image.publicId.trim();
      } else {
        return { kind: 'invalid' };
      }
    } else {
      return { kind: 'invalid' };
    }

    if (!value) return { kind: 'invalid' };

    if (!isPublicIdObject && /^https?:\/\//i.test(value)) {
      let url;
      try {
        url = new URL(value);
      } catch {
        return { kind: 'invalid' };
      }

      if (url.hostname !== 'res.cloudinary.com') return { kind: 'external' };

      const cloudName = cloudinary.config().cloud_name;
      if (typeof cloudName !== 'string' || !cloudName.trim()) {
        return { kind: 'invalid' };
      }

      const segments = url.pathname.slice(1).split('/');
      if (segments[0] !== cloudName) return { kind: 'external' };
      if (
        segments.length < 5
        || segments[1] !== 'image'
        || segments[2] !== 'upload'
        || !/^v\d+$/.test(segments[3])
      ) {
        return { kind: 'invalid' };
      }

      const publicIdSegments = segments.slice(4);
      publicIdSegments[publicIdSegments.length - 1] =
        publicIdSegments[publicIdSegments.length - 1].replace(/\.[^.]+$/, '');
      if (!publicIdSegments.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))) {
        return { kind: 'invalid' };
      }

      const publicId = publicIdSegments.join('/');
      return publicId.startsWith('tipped_tickets/')
        ? { kind: 'owned', publicId }
        : { kind: 'external' };
    }

    if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(value)) return { kind: 'invalid' };

    const publicId = value;
    const publicIdSegments = publicId.split('/');
    if (
      !publicId.startsWith('tipped_tickets/')
      || !publicIdSegments.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))
    ) {
      return { kind: 'invalid' };
    }

    return { kind: 'owned', publicId };
  } catch {
    return { kind: 'invalid' };
  }
};

const safeErrorName = (error) => {
  const name = error && typeof error.name === 'string' ? error.name : 'Error';
  return /^[A-Za-z0-9_.-]+$/.test(name) ? name : 'Error';
};

const logCleanupFailure = (counts, errorNames) => {
  try {
    console.error('Cloudinary image cleanup incomplete', {
      ...counts,
      errorNames: Array.from(errorNames)
    });
  } catch {
    // Cleanup must not interrupt ticket deletion if logging itself fails.
  }
};

const deleteTicketImages = async (ticket) => {
  let entries;
  try {
    entries = getImageEntries(ticket?.images);
  } catch (error) {
    const counts = { requested: 1, deleted: 0, failed: 1, external: 0 };
    logCleanupFailure(counts, new Set([safeErrorName(error)]));
    return counts;
  }

  const counts = { requested: entries.length, deleted: 0, failed: 0, external: 0 };
  const errorNames = new Set();

  for (const image of entries) {
    const classification = classifyImage(image);
    if (classification.kind === 'external') {
      counts.external += 1;
      continue;
    }
    if (classification.kind === 'invalid') {
      counts.failed += 1;
      errorNames.add('InvalidImageReference');
      continue;
    }

    try {
      const result = await cloudinary.uploader.destroy(classification.publicId, { resource_type: 'image' });
      if (result?.result === 'ok' || result?.result === 'not found') {
        counts.deleted += 1;
      } else {
        counts.failed += 1;
        errorNames.add('CloudinaryDeleteError');
      }
    } catch (error) {
      counts.failed += 1;
      errorNames.add(safeErrorName(error));
    }
  }

  if (counts.failed > 0) {
    logCleanupFailure(counts, errorNames);
  }

  return counts;
};

const inspectTicketImages = (ticket) => {
  try {
    const entries = getImageEntries(ticket?.images);
    const counts = { requested: entries.length, owned: 0, external: 0, invalid: 0 };
    try {
      for (const image of entries) {
        const classification = classifyImage(image);
        if (classification.kind === 'owned') {
          counts.owned += 1;
        } else if (classification.kind === 'external') {
          counts.external += 1;
        } else {
          counts.invalid += 1;
        }
      }
    } catch {
      counts.invalid += 1;
    }

    return counts;
  } catch {
    return { requested: 1, owned: 0, external: 0, invalid: 1 };
  }
};

module.exports = { getPublicIds, deleteTicketImages, inspectTicketImages };
