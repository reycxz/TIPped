const crypto = require('crypto');

exports.generateTicketId = (campus, prefix = 'GEN') => {
  const campusCode = campus === 'Arlegui' ? 'ARL' : 'CAS';
  const deptCode = prefix ? String(prefix).toUpperCase() : 'GEN';

  const today = new Date();
  const mmdd = String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
  
  // Generates a 5-character random hex string (e.g., A9F2B)
  const hash = crypto.randomBytes(3).toString('hex').substring(0, 5).toUpperCase();

  return `${campusCode}-${deptCode}${mmdd}${hash}`; 
};
