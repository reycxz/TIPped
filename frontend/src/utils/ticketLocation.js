const cleanValue = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeLocation = (value) =>
  cleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const getSpecificArea = (landmark, campus, building) => {
  let area = cleanValue(landmark);
  if (!area) return '';

  const campusName = cleanValue(campus).replace(/\s+Campus$/i, '');
  if (campusName) {
    const escapedCampus = campusName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    area = area.replace(
      new RegExp(`[,\\s]+${escapedCampus}(?:\\s+Campus)?[\\s.,;:]*$`, 'i'),
      '',
    );
  } else {
    area = area.replace(/[,\s]+(?:Casal|Arlegui)\s+Campus[\s.,;:]*$/i, '');
  }

  area = area.replace(/[,\s]+(?:Floor|Flr)\.?\s*\d+[\s.,;:]*$/i, '').trim();
  area = area.replace(/[\s.,;:]+$/, '').trim();
  return normalizeLocation(area) === normalizeLocation(building) ? '' : area;
};

const compactBuildingName = (building) => {
  const name = cleanValue(building);
  const codedBuilding = name.match(/^(?:Arlegui|Founder'?s)\s*\(([A-Z])\)$/i);
  if (codedBuilding) return `Bldg ${codedBuilding[1].toUpperCase()}`;

  return name.replace(/^Building\b/i, 'Bldg');
};

const isDefaultRoom = (room) =>
  /^\s*common\s+area\s*$/i.test(room) ||
  /^\s*(?:(?:floor|flr)\s*)?\d+\s*[-–—:]\s*common\s+area\s*$/i.test(room);

export const formatTicketLocation = (ticket, variant = 'full', options = {}) => {
  const locationInfo = ticket?.locationInfo || {};
  const campus = cleanValue(ticket?.campus);
  const building = cleanValue(locationInfo.building);
  const floor = cleanValue(locationInfo.floor);
  const room = cleanValue(locationInfo.room);
  const landmark = cleanValue(locationInfo.landmark);
  const specificArea = getSpecificArea(landmark, campus, building);
  const realRoom = room && !isDefaultRoom(room) ? room : '';
  const floorPart = floor ? `Floor ${floor}` : '';
  const fullParts = [building, floorPart, specificArea || realRoom].filter(Boolean);
  const fullPrimary = fullParts.join(' · ');
  const title = fullPrimary;

  if (variant === 'compact') {
    const ticketCampusCode = cleanValue(ticket?.ticketId).split('-')[0]?.toUpperCase();
    const campusCode = campus.toLowerCase() === 'casal'
      ? 'CAS'
      : campus.toLowerCase() === 'arlegui'
        ? 'ARL'
        : '';
    const omitCampus = options.campusFiltered === true || Boolean(campusCode && ticketCampusCode === campusCode);
    const compactParts = [
      !omitCampus && campus ? campus : '',
      compactBuildingName(building),
      floorPart,
      realRoom,
    ].filter(Boolean);

    return {
      text: compactParts.join(' · '),
      title: [campus, building, floorPart, specificArea || realRoom].filter(Boolean).join(' · '),
    };
  }

  return {
    primary: fullPrimary,
    secondary: '',
    title,
  };
};
