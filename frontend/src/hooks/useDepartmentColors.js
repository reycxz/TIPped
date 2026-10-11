import { useEffect, useState } from 'react';
import { getDepartmentColors as fetchDepartmentColors } from '../api/adminData';
import { DEPARTMENT_COLOR_FALLBACK } from '../constants/departmentPalette';

let cachedDepartmentColors = null;
let departmentColorsRequest = null;

const emptyDepartmentColors = { departments: [], categories: [] };

const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const findDepartmentColor = (name, data) => {
  const normalizedName = normalize(name);
  if (!normalizedName) return DEPARTMENT_COLOR_FALLBACK;

  const department = data?.departments.find((item) => normalize(item.name) === normalizedName);
  return department?.color || DEPARTMENT_COLOR_FALLBACK;
};

const findCategoryColor = (issueName, data) => {
  const normalizedIssueName = normalize(issueName);
  if (!normalizedIssueName) return DEPARTMENT_COLOR_FALLBACK;

  const category = data?.categories.find((item) => normalize(item.issueName) === normalizedIssueName);
  return category
    ? findDepartmentColor(category.departmentName, data)
    : DEPARTMENT_COLOR_FALLBACK;
};

const findTicketColor = (ticket, data) => {
  const normalizedIssueName = normalize(ticket?.issueCategory);
  if (normalizedIssueName) {
    const category = data?.categories.find((item) => normalize(item.issueName) === normalizedIssueName);
    if (category) {
      const department = data?.departments.find(
        (item) => normalize(item.name) === normalize(category.departmentName)
      );
      if (department) return department.color || DEPARTMENT_COLOR_FALLBACK;
    }
  }

  return findDepartmentColor(ticket?.assignedDepartment, data);
};

const loadDepartmentColors = () => {
  if (cachedDepartmentColors) return Promise.resolve(cachedDepartmentColors);

  if (!departmentColorsRequest) {
    departmentColorsRequest = fetchDepartmentColors()
      .then((data) => {
        cachedDepartmentColors = {
          departments: Array.isArray(data?.departments) ? data.departments : [],
          categories: Array.isArray(data?.categories) ? data.categories : [],
        };
        return cachedDepartmentColors;
      })
      .catch((error) => {
        console.error('Failed to load department colors:', error);
        departmentColorsRequest = null;
        return emptyDepartmentColors;
      });
  }

  return departmentColorsRequest;
};

export function getDepartmentColor(name) {
  return findDepartmentColor(name, cachedDepartmentColors);
}

export function getCategoryColor(issueName) {
  return findCategoryColor(issueName, cachedDepartmentColors);
}

export function getCategoryDepartmentName(issueName) {
  const normalizedIssueName = normalize(issueName);
  if (!normalizedIssueName) return null;

  const category = cachedDepartmentColors?.categories.find(
    (item) => normalize(item.issueName) === normalizedIssueName
  );
  return category?.departmentName || null;
}

export function getTicketColor(ticket) {
  return findTicketColor(ticket, cachedDepartmentColors);
}

export default function useDepartmentColors() {
  const [colors, setColors] = useState(cachedDepartmentColors);

  useEffect(() => {
    let active = true;
    loadDepartmentColors().then((data) => {
      if (active) setColors(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    getDepartmentColor: (name) => findDepartmentColor(name, colors),
    getCategoryColor: (issueName) => findCategoryColor(issueName, colors),
    getTicketColor: (ticket) => findTicketColor(ticket, colors),
  };
}
