const express = require('express');
const router = express.Router();
const departmentRoutes = require('./departmentRoutes');
const categoryRoutes = require('./categoryRoutes');

// Mount modular Department and Category routers
router.use('/departments', departmentRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
