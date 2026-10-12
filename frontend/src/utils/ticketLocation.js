const cleanValue = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeLocation = (value) =>
  cleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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
  const generatedLandmark = [
    building,
    floor ? `Floor ${floor}` : '',
    campus ? `${campus} Campus` : '',
  ].filter(Boolean).join(', ');
  const secondary = landmark &&
    normalizeLocation(landmark) !== normalizeLocation(generatedLandmark)
    ? landmark
    : '';
  const realRoom = room && !isDefaultRoom(room) ? room : '';
  const floorPart = floor ? `Floor ${floor}` : '';
  const fullParts = [campus, building, floorPart, realRoom].filter(Boolean);
  const fullPrimary = fullParts.join(' · ');
  const title = [fullPrimary, secondary].filter(Boolean).join(' · ');

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
      title,
    };
  }

  return {
    primary: fullPrimary,
    secondary,
    title,
  };
};
