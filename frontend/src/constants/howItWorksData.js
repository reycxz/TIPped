export const OFFICES = [
  {
    name: 'Maintenance',
    color: '#D97706',
    categories: [
      'Comfort Room & Hygiene',
      'Water & Plumbing',
      'Electrical & Sockets',
      'Air Conditioning & Ventilation',
      'Broken Furniture & Fixtures',
    ],
  },
  {
    name: 'ITSO',
    color: '#0284C7',
    categories: [
      'Wi-Fi & Connectivity',
      'Lab Computers & Peripherals',
      'Projectors & Audio/Visual',
    ],
  },
  {
    name: 'SOHAS',
    color: '#DC2626',
    categories: ['Security or Suspicious Activity', 'Medical or Safety Hazard'],
  },
  {
    name: 'Canteen',
    color: '#16A34A',
    categories: ['Food Quality or Hygiene'],
  },
  {
    name: 'OSA',
    color: '#7C3AED',
    categories: ['Student Altercation or Conduct', 'Lost & Found'],
  },
  {
    name: 'General',
    color: '#64748B',
    categories: ['Other / General Issue'],
  },
];

export const INCIDENT_ICONS = [
  {
    path: 'M7 3h10v6H7z M5 9h14l-1.5 6a4 4 0 0 1-4 3h-3a4 4 0 0 1-4-3z M10 18v3 M14 18v3',
    color: '#EA580C',
  },
  {
    path: 'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z',
    color: '#EA580C',
  },
  {
    path: 'M13 2L4 14h7l-1 8 9-12h-7z',
    color: '#EA580C',
  },
  {
    path: 'M12 2v20 M3.3 7l17.4 10 M3.3 17L20.7 7 M9 4l3 2 3-2 M9 20l3-2 3 2',
    color: '#EA580C',
  },
  {
    path: 'M7 3v9h10V3 M5 12h14 M7 12v9 M17 12v9',
    color: '#EA580C',
  },
  {
    path: 'M2 9a15 15 0 0 1 20 0 M5.5 12.5a10 10 0 0 1 13 0 M9 16a5 5 0 0 1 6 0 M12 19.5h.01',
    color: '#0EA5E9',
  },
  {
    path: 'M3 4h18v12H3z M8 20h8 M12 16v4',
    color: '#0EA5E9',
  },
  {
    path: 'M3 8h18v8H3z M15 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M7 12h.01 M6 16v3 M18 16v3',
    color: '#0EA5E9',
  },
  {
    path: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z M12 8v5 M12 16h.01',
    color: '#EF4444',
  },
  {
    path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    color: '#EF4444',
  },
  {
    path: 'M6 3v8 M4 3v5a2 2 0 0 0 4 0V3 M6 11v10 M17 3c-2 1-3 4-3 7h3v11',
    color: '#22C55E',
  },
  {
    path: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20a6 6 0 0 1 12 0 M17 11a3 3 0 1 0 0-6 M21 20a6 6 0 0 0-5-6',
    color: '#8B5CF6',
  },
  {
    path: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-5-5',
    color: '#8B5CF6',
  },
  {
    path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12h.01 M12 12h.01 M16 12h.01',
    color: '#94A3B8',
  },
];

export const STEPS = [
  { label: 'See' },
  { label: 'Snap' },
  { label: 'TIP' },
];

export const PRIVACY_ITEMS = [
  { title: 'Hidden', line: 'Your details stay masked from queues.' },
  { title: 'Consent first', line: 'You agree before anything is sent.' },
  { title: '30 days', line: 'Reports and photos then expire.' },
];

export const MAP_SHAPES = [
  {
    type: 'polygon',
    className: 'mg',
    points: '180,755 423,150 730,150 757,203 835,508 832,750 895,752 1040,845 1048,965 822,915 635,852 465,815 335,795',
  },
  {
    type: 'polyline',
    className: 'mr',
    strokeWidth: 85,
    points: '-60,762 1285,1067',
  },
  {
    type: 'polyline',
    className: 'mr',
    strokeWidth: 40,
    strokeLinejoin: 'round',
    points: '1203,55 1265,1000 1330,1250 1490,1880',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '405,300 503,342 350,688 262,625',
  },
  {
    type: 'polygon',
    className: 'mb o',
    points: '530,328 655,328 655,398 530,398',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '693,270 742,270 742,408 693,408',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '675,468 735,468 735,518 675,518',
  },
  {
    type: 'polygon',
    className: 'mb o',
    points: '420,478 650,478 650,673 420,673',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '455,510 540,510 540,665 455,665',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '672,448 832,448 832,698 672,698',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '677,703 737,703 737,755 677,755',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '740,703 790,703 790,757 740,757',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '225,665 362,705 335,795 210,740',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '405,702 465,702 465,812 405,812',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '565,717 620,717 620,772 565,772',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '632,775 740,775 740,850 632,850',
  },
  {
    type: 'polygon',
    className: 'mb',
    points: '742,775 800,775 800,835 742,835',
  },
  {
    type: 'polygon',
    className: 'mb o',
    points: '808,755 890,752 920,785 928,905 822,910',
  },
  {
    type: 'polygon',
    id: 'bF',
    className: 'mb',
    points: '435,196 692,196 692,290 435,290',
  },
  {
    type: 'polygon',
    id: 'bA',
    className: 'mb',
    points: '1045,1495 1105,1478 1120,1510 1300,1462 1365,1690 1305,1780 1140,1815',
  },
];

export const MAP_LABELS = [
  { text: "Founder's Building", x: 563, y: 254 },
  { text: 'Building 2', x: 381, y: 496 },
  { text: 'PE Center', x: 752, y: 580 },
  { text: 'Arlegui Campus', x: 1215, y: 1660 },
];

export const MAP_VIEWS = {
  overview: [850, 1000, 2100],
  Casal: [640, 520, 1150],
  Arlegui: [1230, 1650, 820],
};
