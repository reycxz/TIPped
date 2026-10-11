const Category = require('../models/Category');
const User = require('../models/User');

const departmentRoleFilter = { role: { $regex: /^department$/i } };

const getDepartmentCategoryNames = async (departmentName) => {
  const categories = await Category.find({ departmentName })
    .sort({ createdAt: 1, _id: 1 })
    .select('issueName');
  return categories.map((category) => category.issueName);
};

const findDepartmentAccounts = async (categoryNames) => {
  if (categoryNames.length === 0) return [];

  return User.find({
    ...departmentRoleFilter,
    $or: [
      { departmentCategory: { $in: categoryNames } },
      { assignedCategories: { $in: categoryNames } },
    ],
  });
};

const syncAccounts = async (accounts, categoryNames, oldCategoryNames = categoryNames) => {
  const oldCategoryNameSet = new Set(oldCategoryNames);
  const skippedAccounts = [];

  for (const account of accounts) {
    const assignedCategories = Array.isArray(account.assignedCategories)
      ? account.assignedCategories
      : [];
    const outsideCategory = assignedCategories.find((name) => !oldCategoryNameSet.has(name));

    if (outsideCategory) {
      const reason = 'assignedCategories contains a category outside the department';
      skippedAccounts.push({ email: account.email, reason });
      console.warn(`[departmentAccountSync] Skipped ${account.email}: ${reason}`);
      continue;
    }

    account.assignedCategories = [...categoryNames];
    account.departmentCategory = categoryNames.includes(account.departmentCategory)
      ? account.departmentCategory
      : (categoryNames[0] || null);
    await account.save();
  }

  return skippedAccounts;
};

module.exports = {
  getDepartmentCategoryNames,
  findDepartmentAccounts,
  syncAccounts,
};
