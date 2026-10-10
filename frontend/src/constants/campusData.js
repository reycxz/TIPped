const R = (x, y, w, h) => `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;

export const CAMPUS_PLACES = [
  {
    id: 'F',
    n: "Founder's Building",
    k: 'Building',
    code: 'F',
    c: 'Casal',
    pts: R(435, 196, 257, 94),
    l: [563, 248],
    fl: {
      1: ["OSA", "Guidance", "Registrar", "Tellering", "SRO"],
      2: ["Human Resource"],
      3: ["Classrooms"],
      4: ["College of Business Education"],
      5: ["Casal Library"],
      6: ["NSTP"]
    }
  },
  {
    id: 'C',
    n: 'Building 2',
    k: 'Building',
    code: 'C',
    c: 'Casal',
    pts: '380,300 470,342 320,688 240,625',
    l: [350, 490],
    fl: {
      1: ["Chemical Engineering Department"],
      2: ["Math & Physics Department", "OVPSAS", "College of Arts"],
      3: ["Architecture Department"]
    }
  },
  { id: 'gar', n: 'Casal Garden', t: 'Casal|Garden', k: 'Open Area', o: 1, c: 'Casal', pts: R(530, 328, 125, 70), l: [593, 360], fl: { 1: ["Garden & Green Space"] }, d: 'Open Area Garden' },
  { id: 'hub', n: 'Student Hub', t: 'Student|Hub', k: 'Student Hub', c: 'Casal', pts: R(693, 270, 49, 138), l: [717, 342], fl: { 1: ["Student Activity Area", "Lounge"] }, d: 'Student Center Facility' },
  { id: 'PE', n: 'PE Center', t: 'PE|Center', k: 'Building', code: 'PE', c: 'Casal', pts: R(672, 448, 160, 250), l: [780, 615], fl: { 1: ["Gymnasium", "Sports Courts"] }, d: 'Physical Education Center' },
  { id: 'sec', n: 'Security', k: 'Facility', c: 'Casal', pts: R(675, 468, 60, 50), l: [717, 497], fl: { 1: ["Security Office"] }, d: 'Campus Security' },
  { id: 'sta', n: 'Study Area / Canteen', t: 'Study Area', k: 'Open Area', o: 1, c: 'Casal', pts: R(420, 478, 230, 195), l: [585, 570], fl: { 1: ["Study Area", "Canteen Seating"] }, d: 'Covered Study & Dining Area' },
  { id: 'can', n: 'Study Area / Canteen', t: 'Canteen', k: 'Open Area', c: 'Casal', pts: '445,490 515,490 515,660 465,660 465,625 445,625', l: [480, 570], fl: { 1: ["Food Stalls", "Dining Area"] }, d: 'Canteen Area' },
  { id: 'cli', n: 'Clinic', k: 'Facility', c: 'Casal', pts: R(677, 703, 60, 52), l: [707, 735], fl: { 1: ["Medical & Dental Clinic"] }, d: 'Health Services' },
  { id: 'ces', n: 'CES', k: 'Facility', c: 'Casal', pts: R(740, 703, 50, 54), l: [765, 735], fl: { 1: ["Community Extension Services"] }, d: 'Extension Office' },
  { id: 'ann', n: 'PE Center Annex', t: 'PE Center|Annex', k: 'Building', code: 'PE Annex', d: 'PE Center Annex Facility', c: 'Casal', pts: '225,665 362,705 335,795 210,740', l: [286, 730], fl: { 1: ["Annex Gymnasium", "Fitness Room"] } },
  { id: 'b3', n: 'Building 3', t: 'Building|3', k: 'Building', c: 'Casal', pts: R(405, 702, 60, 110), l: [434, 757], fl: { 1: ["Classrooms"] }, d: 'Classrooms' },
  { id: 'PC5', n: 'PC 5', k: 'Building', code: 'PC-5', d: 'Front of Study Area', c: 'Casal', pts: '525,715 625,715 625,773 525,773', l: [575, 748], fl: { 1: ["Seminar Room"] } },
  { id: 'PC12', n: 'PC 12', k: 'Building', code: 'PC-12', d: 'Next to Chapel', c: 'Casal', pts: R(632, 775, 108, 75), l: [686, 826], fl: { 1: ["Chapel", "Seminar Room"], 2: ["OVPAA"] } },
  { id: 'cha', n: 'Chapel', k: 'Facility', c: 'Casal', pts: R(742, 775, 58, 60), l: [771, 810], fl: { 1: ["Chapel Sanctuary"] }, d: 'Campus Chapel (Inside PC 12)' },
  { id: 'con', n: 'Congregating Area', t: 'Congregating|Area', k: 'Open Area', o: 1, c: 'Casal', pts: '808,755 890,752 920,785 928,905 822,910', l: [868, 810], fl: { 1: ["Open Plaza"] }, d: 'Outdoor Congregating Grounds' },
  {
    id: 'A',
    n: 'Arlegui Campus',
    t: 'Arlegui|Campus',
    k: 'Building',
    code: 'A',
    c: 'Arlegui',
    pts: '1045,1495 1105,1478 1120,1510 1300,1462 1365,1690 1305,1780 1140,1815',
    l: [1215, 1650],
    fl: {
      1: ["Canteen", "Study Area", "Clinic"],
      2: ["College of Computer Studies", "OVPAA", "Chapel", "CEA Dean", "OSA", "QMO"],
      3: ["Computer Engineering Department", "Electrical Engineering Department", "Electronics Engineering Department"],
      4: ["Civil Engineering Department", "Industrial Engineering Department", "Mechanical Engineering Department"],
      5: ["Arlegui Library"],
      6: ["Teresita U. Quirino Hall", "Anniversary Hall"]
    }
  },
  { id: 'g1', g: 1, n: 'Gate 1', k: 'Gate', c: 'Casal', x: 915, y: 920 },
  { id: 'g2', g: 1, n: 'Gate 2', k: 'Gate', c: 'Casal', x: 358, y: 822 },
  { id: 'g3', g: 1, n: 'Gate 3', k: 'Gate', c: 'Casal', x: 790, y: 432 },
  { id: 'ga', g: 1, n: 'Arlegui Gate', t: 'GATE', k: 'Gate', c: 'Arlegui', x: 1358, y: 1560 }
];

export const CAMPUS_VIEWS = {
  Casal: [640, 520, 1180],
  Arlegui: [1230, 1650, 820]
};

export const QUICK_CHIPS = ['Registrar', 'Clinic', 'Canteen', 'Library', 'Chapel', 'F-306'];

export const BUILDING_CODES = [
  ['F', 'F', ''],
  ['C', 'C', ''],
  ['A', 'A', ''],
  ['PC5', 'PC 5', 'Front of Study Area'],
  ['PC12', 'PC 12', 'Next to Chapel'],
  ['PE', 'PE', 'PE Center'],
  ['ann', 'PE Annex', 'PE Center Annex']
];

export const OPEN_AREA_PLACES = [
  ['sta', 'Study Area / Canteen'],
  ['con', 'Congregating Area'],
  ['gar', 'Casal Garden']
];

/**
 * Strictly format location string per QA specification:
 * "{Place}, Floor {n}, {Campus} Campus" (omit floor if NA)
 */
export function formatLocationString(place, floor) {
  if (!place) return '';
  if (floor && place.fl && place.fl[floor]) {
    return `${place.n}, Floor ${floor}, ${place.c} Campus`;
  }
  return `${place.n}, ${place.c} Campus`;
}

export function buildSearchIndex() {
  const idx = [];
  CAMPUS_PLACES.forEach((p) => {
    idx.push({ l: p.n, s: (p.code ? p.code + ' · ' : '') + p.c + ' Campus', id: p.id });
    Object.entries(p.fl || {}).forEach(([f, a]) => {
      a.forEach((o) => {
        idx.push({ l: o, s: `${p.n} · Floor ${f}`, id: p.id, f: +f });
      });
    });
  });
  return idx;
}
