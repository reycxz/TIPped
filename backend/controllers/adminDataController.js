const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');

// ==========================================
// DEPARTMENT CONTROLLER METHODS
// ==========================================

// @desc    Get all departments
// @route   GET /api/departments or /api/admin-data/departments
// @access  Public
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get single department by ID
// @route   GET /api/departments/:id
// @access  Public
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new department
// @route   POST /api/departments or /api/admin-data/departments
// @access  Private (Superadmin only)
exports.createDepartment = async (req, res) => {
  try {
    const { name, prefix } = req.body;

    if (!name || !prefix) {
      return res.status(400).json({ error: 'Department name and prefix are required' });
    }

    const cleanName = name.trim();
    const cleanPrefix = prefix.trim().toUpperCase();

    if (cleanPrefix.length > 3) {
      return res.status(400).json({ error: 'Prefix cannot exceed 3 characters' });
    }

    // Check for uniqueness
    const existing = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
        { prefix: cleanPrefix }
      ]
    });

    if (existing) {
      return res.status(400).json({ error: 'Department name or prefix already exists' });
    }

    const department = new Department({
      name: cleanName,
      prefix: cleanPrefix
    });

    try {
      await department.save();
    } catch (saveErr) {
      if (saveErr.code === 11000 && saveErr.message.includes('categoryName')) {
        await Department.collection.dropIndex('categoryName_1').catch(() => {});
        await department.save();
      } else {
        throw saveErr;
      }
    }
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id or /api/admin-data/departments/:id
// @access  Private (Superadmin only)
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prefix } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (name && name.trim() !== department.name) {
      const cleanName = name.trim();
      const existingName = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
      });

      if (existingName) {
        return res.status(400).json({ error: 'Department name already exists' });
      }

      // Sync categories linked to this department name
      await Category.updateMany(
        { departmentName: department.name },
        { departmentName: cleanName }
      );

      department.name = cleanName;
    }

    if (prefix) {
      const cleanPrefix = prefix.trim().toUpperCase();
      if (cleanPrefix.length > 3) {
        return res.status(400).json({ error: 'Prefix cannot exceed 3 characters' });
      }

      const existingPrefix = await Department.findOne({
        _id: { $ne: id },
        prefix: cleanPrefix
      });

      if (existingPrefix) {
        return res.status(400).json({ error: 'Prefix already exists' });
      }

      department.prefix = cleanPrefix;
    }

    await department.save();
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a department (Strict Hard Delete)
// @route   DELETE /api/admin/departments/:id or /api/departments/:id
// @access  Private (Superadmin only)
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(200).json({ message: 'Department deleted successfully', department });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// CATEGORY CONTROLLER METHODS
// ==========================================

// @desc    Get all categories
// @route   GET /api/categories or /api/admin-data/categories
// @access  Public (Any user or guest can access)
exports.getCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) {
      filter.departmentName = req.query.department;
    }

    const categories = await Category.find(filter).sort({ issueName: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new category
// @route   POST /api/categories or /api/admin-data/categories
// @access  Private (Superadmin only)
exports.createCategory = async (req, res) => {
  try {
    const { issueName, departmentName } = req.body;

    if (!issueName || !departmentName) {
      return res.status(400).json({ error: 'issueName and departmentName are required' });
    }

    const cleanIssueName = issueName.trim();
    const cleanDepartmentName = departmentName.trim();

    // Verify department exists
    const deptExists = await Department.findOne({
      name: { $regex: new RegExp(`^${cleanDepartmentName}$`, 'i') }
    });

    if (!deptExists) {
      return res.status(400).json({ error: `Department '${cleanDepartmentName}' does not exist` });
    }

    // Check unique issueName
    const existingCat = await Category.findOne({
      issueName: { $regex: new RegExp(`^${cleanIssueName}$`, 'i') }
    });

    if (existingCat) {
      return res.status(400).json({ error: 'Category with this issue name already exists' });
    }

    const category = new Category({
      issueName: cleanIssueName,
      departmentName: deptExists.name
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id or /api/admin-data/categories/:id
// @access  Private (Superadmin only)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { issueName, departmentName } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (departmentName) {
      const cleanDepartmentName = departmentName.trim();
      const deptExists = await Department.findOne({
        name: { $regex: new RegExp(`^${cleanDepartmentName}$`, 'i') }
      });

      if (!deptExists) {
        return res.status(400).json({ error: `Department '${cleanDepartmentName}' does not exist` });
      }

      category.departmentName = deptExists.name;
    }

    if (issueName && issueName.trim() !== category.issueName) {
      const cleanIssueName = issueName.trim();
      const existingCat = await Category.findOne({
        _id: { $ne: id },
        issueName: { $regex: new RegExp(`^${cleanIssueName}$`, 'i') }
      });

      if (existingCat) {
        return res.status(400).json({ error: 'Category with this issue name already exists' });
      }

      category.issueName = cleanIssueName;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a category (Strict Hard Delete)
// @route   DELETE /api/admin/categories/:id or /api/categories/:id
// @access  Private (Superadmin only)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted successfully', category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a user account (Strict Hard Delete)
// @route   DELETE /api/admin/users/:id or /api/users/:id
// @access  Private (Superadmin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'Account deleted successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

