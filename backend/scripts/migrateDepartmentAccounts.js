require('dns').setServers(['1.1.1.1','8.8.8.8']);

const applyChanges = process.argv.includes('--apply');
console.log(applyChanges ? 'MODE: APPLY' : 'MODE: DRY RUN (no writes)');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Category = require('../models/Category');
const User = require('../models/User');

const departmentRoleFilter = { role: { $regex: /^department$/i } };
const statusNames = ['OK', 'FIXABLE', 'CROSS_DEPARTMENT', 'UNKNOWN_CATEGORY', 'UNRESOLVED'];

const getErrorMessage = (error, databaseAddress) => {
  let message = error?.message || String(error);
  if (databaseAddress) message = message.split(databaseAddress).join('[redacted MongoDB URI]');
  message = message.replace(/mongodb(?:\+srv)?:\/\/[^\s'"]+/gi, '[redacted MongoDB URI]');
  return `${error?.name || 'Error'}: ${message}`;
};

const resolveDepartmentName = (account, categoryByName) => {
  const primaryCategory = categoryByName.get(account.departmentCategory);
  if (primaryCategory?.departmentName) return primaryCategory.departmentName;

  const categoryCounts = new Map();
  for (const categoryName of account.assignedCategories) {
    const category = categoryByName.get(categoryName);
    if (category?.departmentName) {
      categoryCounts.set(
        category.departmentName,
        (categoryCounts.get(category.departmentName) || 0) + 1
      );
    }
  }

  const rankedDepartments = [...categoryCounts.entries()].sort((left, right) => right[1] - left[1]);
  if (rankedDepartments.length === 0) return null;
  if (rankedDepartments.length > 1 && rankedDepartments[0][1] === rankedDepartments[1][1]) return null;
  return rankedDepartments[0][0];
};

const classifyAccount = (account, categoryByName, categoryNamesByDepartment) => {
  const assignedCategories = Array.isArray(account.assignedCategories)
    ? account.assignedCategories
    : [];
  const departmentName = resolveDepartmentName({ ...account, assignedCategories }, categoryByName);
  const departmentCategoryNames = departmentName
    ? (categoryNamesByDepartment.get(departmentName) || [])
    : null;
  const assignedSet = new Set(assignedCategories);
  const departmentSet = departmentCategoryNames ? new Set(departmentCategoryNames) : null;
  const missing = departmentCategoryNames
    ? departmentCategoryNames.filter((name) => !assignedSet.has(name))
    : null;
  const extra = departmentCategoryNames
    ? [...new Set(assignedCategories)].filter((name) => !departmentSet.has(name))
    : null;

  let status = 'UNRESOLVED';
  if (departmentCategoryNames) {
    const hasCrossDepartmentCategory = assignedCategories.some((name) => {
      const category = categoryByName.get(name);
      return category && category.departmentName !== departmentName;
    });
    const hasUnknownCategory = assignedCategories.some((name) => !categoryByName.has(name));

    if (hasCrossDepartmentCategory) {
      status = 'CROSS_DEPARTMENT';
    } else if (hasUnknownCategory) {
      status = 'UNKNOWN_CATEGORY';
    } else {
      const categoriesMatch = assignedSet.size === departmentSet.size
        && [...assignedSet].every((name) => departmentSet.has(name));
      status = categoriesMatch && departmentSet.has(account.departmentCategory)
        ? 'OK'
        : 'FIXABLE';
    }
  }

  return {
    account,
    departmentName,
    departmentCategoryNames,
    assignedCategories,
    missing,
    extra,
    status,
  };
};

const formatNames = (names) => (names === null ? '[UNDETERMINED]' : JSON.stringify(names));

const printAnalysis = (departments, classifications, categoryNamesByDepartment) => {
  const statusCounts = Object.fromEntries(statusNames.map((status) => [status, 0]));
  const accountsByDepartment = new Map(departments.map(({ name }) => [name, []]));

  for (const classification of classifications) {
    statusCounts[classification.status] += 1;
    if (classification.departmentName && accountsByDepartment.has(classification.departmentName)) {
      accountsByDepartment.get(classification.departmentName).push(classification);
    }
  }

  const departmentStats = departments.map(({ name }) => ({
    name,
    categoryCount: categoryNamesByDepartment.get(name)?.length || 0,
    accountCount: accountsByDepartment.get(name)?.length || 0,
  }));
  const duplicateDepartments = departmentStats.filter(({ accountCount }) => accountCount >= 2);
  const accountsWithoutCategories = departmentStats.filter(
    ({ categoryCount, accountCount }) => accountCount > 0 && categoryCount === 0
  );
  const categoriesWithoutAccounts = departmentStats.filter(
    ({ categoryCount, accountCount }) => categoryCount > 0 && accountCount === 0
  );

  console.log('STATUS COUNTS');
  for (const status of statusNames) console.log(`${status}: ${statusCounts[status]}`);
  console.log('FLAG COUNTS');
  console.log(`DUPLICATE_ACCOUNTS: ${duplicateDepartments.length}`);
  console.log(`ACCOUNT_BUT_NO_CATEGORIES: ${accountsWithoutCategories.length}`);

  for (const department of departmentStats) {
    console.log(
      `DEPARTMENT: ${department.name} | categories=${department.categoryCount}`
      + ` | accounts=${department.accountCount}`
    );
  }

  for (const classification of classifications) {
    if (classification.status === 'OK') continue;
    const department = classification.departmentName || 'UNRESOLVED';
    const primaryCategoryIssue = classification.departmentCategoryNames
      && !classification.departmentCategoryNames.includes(classification.account.departmentCategory)
      ? `; primary not in department list=${JSON.stringify(classification.account.departmentCategory)}`
      : '';
    console.log(
      `ACCOUNT: ${classification.account.email} | department=${department} | status=${classification.status}`
      + ` | missing=${formatNames(classification.missing)} | extra=${formatNames(classification.extra)}`
      + primaryCategoryIssue
    );
  }

  const flaggedDepartments = departmentStats.filter(({ categoryCount, accountCount }) => (
    accountCount >= 2 || (accountCount > 0 && categoryCount === 0)
  ));
  for (const department of flaggedDepartments) {
    const flags = [];
    if (department.accountCount >= 2) flags.push('DUPLICATE_ACCOUNTS');
    if (department.accountCount > 0 && department.categoryCount === 0) {
      flags.push('ACCOUNT_BUT_NO_CATEGORIES');
    }
    console.log(
      `DEPARTMENT FLAG: ${department.name} | ${flags.join(', ')}`
      + ` | categories=${department.categoryCount} | accounts=${department.accountCount}`
    );
  }

  const noAccountDepartmentNames = categoriesWithoutAccounts.map(({ name }) => name);
  console.log(
    `DEPARTMENTS WITH CATEGORIES AND NO ACCOUNT (informational): `
    + `${noAccountDepartmentNames.length ? noAccountDepartmentNames.join(', ') : 'none'}`
  );

  return { accountsByDepartment, statusCounts };
};

const migrateDepartmentAccounts = async () => {
  let exitCode = 0;
  const databaseAddress = process.env.MONGO_URI;

  try {
    if (!databaseAddress || !databaseAddress.trim()) {
      throw new Error('Database address not set (variable MONGO_URI)');
    }

    await mongoose.connect(databaseAddress);

    const [departments, categories, accounts] = await Promise.all([
      Department.find().select('name').lean(),
      Category.find().sort({ createdAt: 1, _id: 1 }).select('issueName departmentName').lean(),
      User.find(departmentRoleFilter)
        .select('email role departmentCategory assignedCategories')
        .lean(),
    ]);

    const categoryByName = new Map(categories.map((category) => [category.issueName, category]));
    const categoryNamesByDepartment = new Map(departments.map(({ name }) => [name, []]));
    for (const category of categories) {
      if (categoryNamesByDepartment.has(category.departmentName)) {
        categoryNamesByDepartment.get(category.departmentName).push(category.issueName);
      }
    }

    const classifications = accounts.map((account) => (
      classifyAccount(account, categoryByName, categoryNamesByDepartment)
    ));
    const { accountsByDepartment } = printAnalysis(
      departments,
      classifications,
      categoryNamesByDepartment
    );

    const plannedFixes = classifications.filter((classification) => (
      classification.status === 'FIXABLE'
      && classification.departmentName
      && accountsByDepartment.get(classification.departmentName)?.length === 1
    ));

    if (!applyChanges) {
      console.log(
        `Would fix ${plannedFixes.length} account(s) (FIXABLE in departments with exactly one account)`
      );
      return;
    }

    let fixedCount = 0;
    const skippedAccounts = [];
    for (const classification of classifications) {
      if (classification.status !== 'FIXABLE') {
        skippedAccounts.push({
          email: classification.account.email,
          reason: `status is ${classification.status}`,
        });
        continue;
      }

      const departmentAccounts = accountsByDepartment.get(classification.departmentName) || [];
      if (departmentAccounts.length !== 1) {
        skippedAccounts.push({
          email: classification.account.email,
          reason: `department has ${departmentAccounts.length} resolved account(s); exactly one is required`,
        });
        continue;
      }

      const categoryNames = categoryNamesByDepartment.get(classification.departmentName) || [];
      const departmentCategory = categoryNames.includes(classification.account.departmentCategory)
        ? classification.account.departmentCategory
        : (categoryNames[0] || null);

      await User.updateOne(
        { _id: classification.account._id },
        { $set: { assignedCategories: categoryNames, departmentCategory } }
      );
      fixedCount += 1;
    }

    for (const skipped of skippedAccounts) {
      console.log(`SKIPPED ACCOUNT: ${skipped.email} | reason=${skipped.reason}`);
    }
    console.log(`Fixed ${fixedCount} account(s)`);
  } catch (error) {
    console.error('Department account migration failed:', getErrorMessage(error, databaseAddress));
    exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Failed to disconnect from the database:', getErrorMessage(error, databaseAddress));
      exitCode = 1;
    }
    process.exitCode = exitCode;
  }
};

migrateDepartmentAccounts();
