const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const {
  getDepartmentCategoryNames,
  findDepartmentAccounts,
  syncAccounts,
} = require('../utils/departmentAccountSync');
const normalizeHex = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DEPARTMENT_PALETTE = [
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#6366F1',
  '#14B8A6',
  '#D946EF',
  '#F97316',
  '#84CC16',
  '#06B6D4',
  '#94A3B8',
  '#7C3AED',
  '#A855F7',
  '#C084FC',
  '#9333EA',
  '#C026D3',
  '#E879F9',
  '#F472B6',
  '#FB7185',
  '#F43F5E',
  '#E11D48',
  '#BE123C',
  '#DC2626',
  '#B91C1C',
  '#991B1B',
  '#7C2D12',
  '#B45309',
  '#C2410C',
  '#D97706',
  '#EA580C',
  '#FDBA74',
  '#4F46E5',
  '#4338CA',
  '#312E81',
  '#475569',
  '#64748B',
  '#0F766E',
];

const serializeDepartment = (department) => {
  const departmentData = department.toObject ? department.toObject() : department;
  return { ...departmentData, color: departmentData.color || null };
};

// ==========================================
// DEPARTMENT CONTROLLER METHODS
// ==========================================

// @desc    Get all departments
// @route   GET /api/departments or /api/admin-data/departments
// @access  Public
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments.map(serializeDepartment));
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
    res.json(serializeDepartment(department));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new department
// @route   POST /api/departments or /api/admin-data/departments
// @access  Private (Superadmin only)
exports.createDepartment = async (req, res) => {
  try {
    const { name, prefix, color } = req.body;

    if (!name || !prefix) {
      return res.status(400).json({ error: 'Department name and prefix are required' });
    }

    const cleanName = name.trim();
    const cleanPrefix = prefix.trim().toUpperCase();

    if (cleanPrefix.length > 3) {
      return res.status(400).json({ error: 'Prefix cannot exceed 3 characters' });
    }

    if (color !== undefined && color !== null) {
      const normalizedColor = normalizeHex(color);
      if (!DEPARTMENT_PALETTE.some((paletteColor) => normalizeHex(paletteColor) === normalizedColor)) {
        return res.status(400).json({ error: 'Department color must be a palette value' });
      }

      const existingDepartments = await Department.find().select('color');
      const usedColors = new Set(
        existingDepartments
          .map((item) => normalizeHex(item.color))
          .filter(Boolean)
      );

      if (usedColors.has(normalizedColor)) {
        return res.status(409).json({ error: 'Color already in use' });
      }
    }

    // Check for uniqueness
    const existing = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') } },
        { prefix: cleanPrefix }
      ]
    });

    if (existing) {
      return res.status(400).json({ error: 'Department name or prefix already exists' });
    }

    let assignedColor = color;
    if (assignedColor === undefined || assignedColor === null || assignedColor === '') {
      const existingDepartments = await Department.find().select('color');
      const usedColors = new Set(
        existingDepartments
          .map((item) => normalizeHex(item.color))
          .filter(Boolean)
      );
      const freeColor = DEPARTMENT_PALETTE.find(
        (paletteColor) => !usedColors.has(normalizeHex(paletteColor))
      );

      if (!freeColor) {
        return res.status(409).json({ error: 'All department colors are in use' });
      }

      assignedColor = freeColor;
    } else {
      assignedColor = DEPARTMENT_PALETTE.find(
        (paletteColor) => normalizeHex(paletteColor) === normalizeHex(color)
      ) || color;
    }

    const department = new Department({
      name: cleanName,
      prefix: cleanPrefix,
      color: assignedColor
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
    res.status(201).json(serializeDepartment(department));
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
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') }
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

    // Color is intentionally ignored on update. Department colors are managed only on creation.
    await department.save();
    res.json(serializeDepartment(department));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a department (Strict Hard Delete)
// @route   DELETE /api/admin/departments/:id or /api/departments/:id
// @access  Private (Superadmin only)
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const categories = await Category.find({ departmentName: department.name }).select('issueName');
    const categoryNames = categories.map((category) => category.issueName);
    const accounts = categoryNames.length
      ? await User.countDocuments({
        $or: [
          { assignedCategories: { $in: categoryNames } },
          { departmentCategory: { $in: categoryNames } },
        ],
      })
      : 0;

    if (categories.length > 0 || accounts > 0) {
      return res.status(409).json({
        message: 'Department cannot be deleted while categories or accounts are assigned.',
        error: 'Department cannot be deleted while categories or accounts are assigned.',
        counts: { categories: categories.length, accounts },
      });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Department deleted successfully',
      department: serializeDepartment(department),
    });
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
      name: { $regex: new RegExp(`^${escapeRegex(cleanDepartmentName)}$`, 'i') }
    });

    if (!deptExists) {
      return res.status(400).json({ error: `Department '${cleanDepartmentName}' does not exist` });
    }

    // Check unique issueName
    const existingCat = await Category.findOne({
      issueName: { $regex: new RegExp(`^${escapeRegex(cleanIssueName)}$`, 'i') }
    });

    if (existingCat) {
      return res.status(400).json({ error: 'Category with this issue name already exists' });
    }

    const oldCategoryNames = await getDepartmentCategoryNames(deptExists.name);
    const accounts = await findDepartmentAccounts(oldCategoryNames);

    const category = new Category({
      issueName: cleanIssueName,
      departmentName: deptExists.name
    });

    await category.save();
    const categoryNames = await getDepartmentCategoryNames(deptExists.name);
    await syncAccounts(accounts, categoryNames, oldCategoryNames);
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

    if (
      (issueName && issueName.trim() !== category.issueName)
      || (departmentName && departmentName.trim() !== category.departmentName)
    ) {
      return res.status(409).json({ error: 'Renaming or moving categories is not supported yet.' });
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
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const oldCategoryNames = await getDepartmentCategoryNames(category.departmentName);
    const accounts = await findDepartmentAccounts(oldCategoryNames);
    const ticketCount = await Ticket.countDocuments({ issueCategory: category.issueName });

    if (ticketCount > 0) {
      return res.status(409).json({
        message: 'Category cannot be deleted while tickets are assigned.',
        error: 'Category cannot be deleted while tickets are assigned.',
        counts: { tickets: ticketCount },
      });
    }

    if (oldCategoryNames.length === 1 && accounts.length > 0) {
      const message = 'A department with an account must keep at least one category. Delete the account first.';
      return res.status(409).json({
        message,
        error: message,
        counts: { accounts: accounts.length },
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    const categoryNames = await getDepartmentCategoryNames(category.departmentName);
    await syncAccounts(accounts, categoryNames, oldCategoryNames);
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
