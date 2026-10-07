const express = require('express');
const router = express.Router();
const adminDataController = require('../controllers/adminDataController');
const { verifyToken, requireRole } = require('../middleware/auth');

// ==========================================
// Category Routes (/api/categories)
// ==========================================

// Public GET (allows all users and guests to view categories)
router.get('/', adminDataController.getCategories);
router.get('/:id', adminDataController.getCategoryById);

// Protected Superadmin-only mutation routes
router.post('/', verifyToken, requireRole('Superadmin'), adminDataController.createCategory);
router.put('/:id', verifyToken, requireRole('Superadmin'), adminDataController.updateCategory);
router.delete('/:id', verifyToken, requireRole('Superadmin'), adminDataController.deleteCategory);

module.exports = router;
