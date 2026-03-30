/**
 * Role-based color utilities using direct color values
 * Alternative method that doesn't rely on CSS custom properties
 */

export type UserRole = 'Admin' | 'Manager' | 'Employee';

// Direct color values for role-based styling
export const roleColors = {
  Admin: {
    // Bright Red (highest level - full organization control)
    primary: '#dc2626',      // red-600
    background: '#fef2f2',   // red-50
    foreground: '#ffffff',   // white
    border: '#fecaca',       // red-200
    hover: '#b91c1c',        // red-700
    muted: '#fee2e2',        // red-100
    text: '#991b1b',         // red-800
  },
  Manager: {
    // Blue
    primary: '#2563eb',       // blue-600
    background: '#eff6ff',   // blue-50
    foreground: '#ffffff',   // white
    border: '#bfdbfe',       // blue-200
    hover: '#1d4ed8',        // blue-700
    muted: '#dbeafe',        // blue-100
    text: '#1e40af',         // blue-800
  },
  Employee: {
    // Emerald Green
    primary: '#059669',      // emerald-600
    background: '#ecfdf5',   // emerald-50
    foreground: '#ffffff',   // white
    border: '#a7f3d0',       // emerald-200
    hover: '#047857',        // emerald-700
    muted: '#d1fae5',        // emerald-100
    text: '#065f46',         // emerald-800
  },
} as const;

// Dark mode colors
export const roleColorsDark = {
  Admin: {
    primary: '#ef4444',      // red-500
    background: '#7f1d1d',   // red-900
    foreground: '#ffffff',
    border: '#991b1b',       // red-800
    hover: '#dc2626',        // red-600
    muted: '#991b1b',        // red-800
    text: '#fca5a5',         // red-300
  },
  Manager: {
    primary: '#3b82f6',      // blue-500
    background: '#1e3a8a',   // blue-900
    foreground: '#ffffff',
    border: '#1e40af',       // blue-800
    hover: '#2563eb',        // blue-600
    muted: '#1e40af',        // blue-800
    text: '#93c5fd',         // blue-300
  },
  Employee: {
    primary: '#10b981',      // emerald-500
    background: '#064e3b',   // emerald-900
    foreground: '#ffffff',
    border: '#065f46',       // emerald-800
    hover: '#059669',        // emerald-600
    muted: '#065f46',        // emerald-800
    text: '#6ee7b7',         // emerald-300
  },
} as const;

/**
 * Get role colors based on theme with fallback
 */
export function getRoleColors(role: UserRole, isDark = false) {
  const colorMap = isDark ? roleColorsDark : roleColors;
  const colors = colorMap[role];

  // Fallback to Employee colors if role not found
  if (!colors) {
    console.warn(`Role colors not found for role: ${role}, falling back to Employee`);
    return colorMap.Employee;
  }

  return colors;
}

/**
 * Get role color for a specific property with fallback
 */
export function getRoleColor(role: UserRole, property: keyof typeof roleColors.Manager, isDark = false) {
  const colors = getRoleColors(role, isDark);

  // Ensure colors exist and have the requested property
  if (!colors || !colors[property]) {
    console.warn(`Role color property '${property}' not found for role: ${role}`);
    const fallbackColors = getRoleColors('Employee', isDark);
    return fallbackColors[property] || '#6b7280'; // zinc-500 as ultimate fallback
  }

  return colors[property];
}

/**
 * Generate inline styles for role-based components with error handling
 */
export function getRoleStyles(role: UserRole, variant: 'solid' | 'outline' | 'muted' = 'solid', isDark = false) {
  const colors = getRoleColors(role, isDark);

  // Ensure colors object exists
  if (!colors) {
    console.error(`Failed to get colors for role: ${role}`);
    return {};
  }

  switch (variant) {
    case 'solid':
      return {
        backgroundColor: colors.primary || '#6b7280',
        color: colors.foreground || '#ffffff',
        borderColor: colors.primary || '#6b7280',
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: colors.primary || '#6b7280',
        borderColor: colors.primary || '#6b7280',
      };
    case 'muted':
      return {
        backgroundColor: colors.muted || '#f3f4f6',
        color: colors.text || '#374151',
        borderColor: colors.border || '#d1d5db',
      };
    default:
      return {};
  }
}

/**
 * Get Tailwind CSS classes for role colors (fallback method)
 */
export function getRoleTailwindClasses(role: UserRole, variant: 'solid' | 'outline' | 'muted' = 'solid') {
  const baseClasses = 'transition-colors duration-200';
  
  switch (role) {
    case 'Admin':
      switch (variant) {
        case 'solid':
          return `${baseClasses} bg-red-600 text-white border-red-600 hover:bg-red-700`;
        case 'outline':
          return `${baseClasses} bg-transparent text-red-600 border-red-600 hover:bg-red-50`;
        case 'muted':
          return `${baseClasses} bg-red-100 text-red-800 border-red-200 hover:bg-red-200`;
      }
      break;

    case 'Manager':
      switch (variant) {
        case 'solid':
          return `${baseClasses} bg-blue-600 text-white border-blue-600 hover:bg-blue-700`;
        case 'outline':
          return `${baseClasses} bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50`;
        case 'muted':
          return `${baseClasses} bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200`;
      }
      break;

    case 'Employee':
      switch (variant) {
        case 'solid':
          return `${baseClasses} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`;
        case 'outline':
          return `${baseClasses} bg-transparent text-emerald-600 border-emerald-600 hover:bg-emerald-50`;
        case 'muted':
          return `${baseClasses} bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200`;
      }
      break;
  }
  
  return baseClasses;
}

/**
 * Role configuration with icons and labels
 */
export const roleConfig = {
  Admin: {
    label: 'Admin',
    description: 'Full system control and organization management',
  },
  Manager: {
    label: 'Manager',
    description: 'Full system access and user management',
  },
  Employee: {
    label: 'Employee',
    description: 'Task execution and project participation',
  },
} as const;

/**
 * Get role configuration with fallback
 */
export function getRoleConfig(role: UserRole) {
  const config = roleConfig[role];

  // Fallback to Employee config if role not found
  if (!config) {
    console.warn(`Role config not found for role: ${role}, falling back to Employee`);
    return roleConfig.Employee;
  }

  return config;
}

/**
 * Check if user has required role level
 */
export function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = { Admin: 3, Manager: 2, Employee: 1 };
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}
