const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const dns = require('dns');
const Department = require('../models/Department');

const PALETTE = [
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
];

const assignDepartmentColors = async () => {
  const applyChanges = process.argv.includes('--apply');
  const databaseAddress = process.env.MONGO_URI;
  const hasDatabaseAddress = Boolean(databaseAddress && databaseAddress.trim());

  if (!hasDatabaseAddress) {
    console.log('Database address variable MONGO_URI: set=no');
    console.error('Database address not set (variable MONGO_URI)');
    process.exitCode = 1;
    return;
  }

  const authority = databaseAddress
    .replace(/^mongodb(?:\+srv)?:\/\//i, '')
    .split(/[/?#]/, 1)[0]
    .split('@')
    .pop();
  const isLocalDatabase = /^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)(?::\d+)?$/i.test(authority);
  console.log(`Database address variable MONGO_URI: set=yes; host=${isLocalDatabase ? 'local' : 'remote'}`);

  try {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (error) {
      console.error('Unable to set DNS servers:', error.name);
    }

    await mongoose.connect(databaseAddress);
    const departments = await Department.find().sort({ createdAt: 1, _id: 1 });
    const usedColors = new Set(
      departments
        .map((department) => department.color)
        .filter((color) => PALETTE.includes(color))
    );
    const plannedUpdates = [];
    let fallbackIndex = departments.length;

    for (const department of departments) {
      if (department.color) {
        plannedUpdates.push({
          department,
          currentColor: department.color,
          plannedColor: department.color,
        });
        continue;
      }

      const unusedColor = PALETTE.find((color) => !usedColors.has(color));
      const plannedColor = unusedColor || PALETTE[fallbackIndex % PALETTE.length];
      usedColors.add(plannedColor);
      if (!unusedColor) fallbackIndex += 1;

      plannedUpdates.push({
        department,
        currentColor: department.color || '(none)',
        plannedColor,
      });
    }

    console.table(
      plannedUpdates.map(({ department, currentColor, plannedColor }) => ({
        department: department.name,
        currentColor,
        plannedColor,
      }))
    );

    if (applyChanges) {
      for (const { department, plannedColor } of plannedUpdates) {
        if (!department.color) {
          department.color = plannedColor;
          await department.save();
        }
      }
      console.log('Department colors applied.');
    } else {
      console.log('Dry run only. Use --apply to write these colors.');
    }
  } catch (error) {
    console.error('Failed to assign department colors:', error.name);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

assignDepartmentColors();
