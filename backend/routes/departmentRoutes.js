const express = require('express');
const router = express.Router();
const adminDataController = require('../controllers/adminDataController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/ownership');

// ==========================================
// Department Routes (/api/departments)
// ==========================================

// Public GET (allows all users/guests to view departments)
router.get('/', adminDataController.getDepartments);
router.get('/:id', validateObjectId, adminDataController.getDepartmentById);

// Protected Superadmin-only mutation routes
router.post('/', verifyToken, requireRole('Superadmin'), adminDataController.createDepartment);
router.put('/:id', verifyToken, requireRole('Superadmin'), validateObjectId, adminDataController.updateDepartment);
router.delete('/:id', verifyToken, requireRole('Superadmin'), validateObjectId, adminDataController.deleteDepartment);

module.exports = router;
