const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminDataController = require('../controllers/adminDataController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/ownership');

router.use(verifyToken, requireRole('Superadmin'));

// ============================================================================
// SUPERADMIN STRICT HARD DELETE ROUTES (Constraint 1)
// ============================================================================

// DELETE /api/admin/users/:id -> Permanently drops user from MongoDB
router.delete('/users/:id', validateObjectId, authController.deleteDepartmentAccount);

// DELETE /api/admin/departments/:id -> Permanently drops department from MongoDB
router.delete('/departments/:id', validateObjectId, adminDataController.deleteDepartment);

// DELETE /api/admin/categories/:id -> Permanently drops category from MongoDB
router.delete('/categories/:id', validateObjectId, adminDataController.deleteCategory);

// ============================================================================
// AUXILIARY ADMIN DATA ENDPOINTS
// ============================================================================
router.get('/departments', adminDataController.getDepartments);
router.post('/departments', verifyToken, requireRole('Superadmin'), adminDataController.createDepartment);
router.put('/departments/:id', validateObjectId, adminDataController.updateDepartment);

router.get('/categories', adminDataController.getCategories);
router.post('/categories', verifyToken, requireRole('Superadmin'), adminDataController.createCategory);
router.put('/categories/:id', validateObjectId, adminDataController.updateCategory);

router.get('/users', verifyToken, requireRole('Superadmin'), authController.getDepartmentAccounts);
router.post('/users', verifyToken, requireRole('Superadmin'), authController.createDepartmentAccount);

module.exports = router;
