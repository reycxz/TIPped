const crypto = require('crypto');

exports.generateTicketId = (campus, category) => {
  const campusCode = campus === 'Arlegui' ? 'ARL' : 'CAS';
  const deptCodes = {
    'ITSO': 'ITS',
    'Maintenance': 'MNT',
    'SOHAS': 'SOH',
    'Canteen': 'CAN',
    'OSA': 'OSA',
    'Guidance': 'GUI'
  };
  const deptCode = deptCodes[category] || (category ? category.substring(0, 3).toUpperCase() : 'GEN');

  const today = new Date();
  const mmdd =
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  // Generates a 5-character random hex string (e.g., A9F2B)
  const hash = crypto.randomBytes(3).toString('hex').substring(0, 5).toUpperCase();

  return `${campusCode}-${deptCode}${mmdd}${hash}`;
};
