const express = require('express');
const router = express.Router();
const adminDataController = require('../controllers/adminDataController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/ownership');

// ==========================================
// Category Routes (/api/categories)
// ==========================================

// Public GET (allows all users and guests to view categories)
router.get('/', adminDataController.getCategories);
router.get('/:id', validateObjectId, adminDataController.getCategoryById);

// Protected Superadmin-only mutation routes
router.post('/', verifyToken, requireRole('Superadmin'), adminDataController.createCategory);
router.put('/:id', verifyToken, requireRole('Superadmin'), validateObjectId, adminDataController.updateCategory);
router.delete('/:id', verifyToken, requireRole('Superadmin'), validateObjectId, adminDataController.deleteCategory);

module.exports = router;
