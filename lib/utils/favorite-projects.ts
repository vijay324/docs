import type { Project } from '@/utils/types';

/**
 * Utility functions for managing favorite projects
 */

export interface FavoriteProjectUtils {
  getFavoriteProjects: () => string[];
  setFavoriteProjects: (projectIds: string[]) => void;
  addToFavorites: (projectId: string) => void;
  removeFromFavorites: (projectId: string) => void;
  isFavorite: (projectId: string) => boolean;
  getCurrentFavorite: () => string | null;
  hasFavorite: () => boolean;
  getAutoSelectProject: (projects: Project[]) => Project | null;
  clearFavorites: () => void;
}

const FAVORITES_STORAGE_KEY = 'favoriteProjects';
const LAST_SELECTED_PROJECT_KEY = 'lastSelectedProject';
const RECENT_PROJECTS_KEY = 'recentProjects';

/**
 * Get favorite project IDs from localStorage
 */
export function getFavoriteProjects(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error reading favorite projects from localStorage:', error);
    return [];
  }
}

/**
 * Set favorite project IDs in localStorage
 */
export function setFavoriteProjects(projectIds: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(projectIds));
  } catch (error) {
    console.error('Error saving favorite projects to localStorage:', error);
  }
}

/**
 * Add a project to favorites (replaces any existing favorite)
 * Only one project can be favorite at a time
 */
export function addToFavorites(projectId: string): void {
  if (!projectId) return;

  // Set this project as the only favorite
  setFavoriteProjects([projectId]);
}

/**
 * Remove a project from favorites
 */
export function removeFromFavorites(projectId: string): void {
  const favorites = getFavoriteProjects();
  setFavoriteProjects(favorites.filter(id => id !== projectId));
}

/**
 * Check if a project is in favorites
 */
export function isFavorite(projectId: string): boolean {
  return getFavoriteProjects().includes(projectId);
}

/**
 * Get the current favorite project ID (since only one is allowed)
 */
export function getCurrentFavorite(): string | null {
  const favorites = getFavoriteProjects();
  return favorites.length > 0 ? favorites[0] : null;
}

/**
 * Check if any project is currently favorited
 */
export function hasFavorite(): boolean {
  const favorites = getFavoriteProjects();
  return favorites.length > 0;
}

/**
 * Get recent projects from localStorage
 */
export function getRecentProjects(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(RECENT_PROJECTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error reading recent projects from localStorage:', error);
    return [];
  }
}

/**
 * Add a project to recent projects list
 */
export function addToRecentProjects(projectId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentProjects();
    const filtered = recent.filter(id => id !== projectId);
    const updated = [projectId, ...filtered].slice(0, 5); // Keep only last 5
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent projects to localStorage:', error);
  }
}

/**
 * Get the last selected project ID
 */
export function getLastSelectedProject(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(LAST_SELECTED_PROJECT_KEY);
  } catch (error) {
    console.error('Error reading last selected project from localStorage:', error);
    return null;
  }
}

/**
 * Set the last selected project ID
 */
export function setLastSelectedProject(projectId: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (projectId) {
      localStorage.setItem(LAST_SELECTED_PROJECT_KEY, projectId);
      addToRecentProjects(projectId);
    } else {
      localStorage.removeItem(LAST_SELECTED_PROJECT_KEY);
    }
  } catch (error) {
    console.error('Error saving last selected project to localStorage:', error);
  }
}

/**
 * Automatically select a project based on favorites, recent activity, and user involvement
 * Priority order:
 * 1. Last selected project (if it's still available and user has access)
 * 2. First favorite project (if user has access)
 * 3. Most recently updated project where user is involved
 * 4. Project created by the user (most recent)
 * 5. First available project
 */
export function getAutoSelectProject(projects: Project[]): Project | null {
  if (!projects || projects.length === 0) return null;

  // 1. Try last selected project
  const lastSelectedId = getLastSelectedProject();
  if (lastSelectedId) {
    const lastSelected = projects.find(p => p._id === lastSelectedId);
    if (lastSelected) {
      return lastSelected;
    }
  }

  // 2. Try first favorite project
  const favorites = getFavoriteProjects();
  if (favorites.length > 0) {
    for (const favoriteId of favorites) {
      const favoriteProject = projects.find(p => p._id === favoriteId);
      if (favoriteProject) {
        return favoriteProject;
      }
    }
  }

  // 3. Try most recently updated project
  const sortedByUpdate = [...projects].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  if (sortedByUpdate.length > 0) {
    return sortedByUpdate[0];
  }

  // 4. Fallback to first available project
  return projects[0];
}

/**
 * Clear all favorite projects
 */
export function clearFavorites(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing favorite projects from localStorage:', error);
  }
}

/**
 * Get project selection priority score for sorting
 */
export function getProjectPriorityScore(project: Project, userId?: string): number {
  let score = 0;
  
  // Favorite projects get highest priority
  if (isFavorite(project._id)) {
    score += 1000;
  }
  
  // Recent projects get medium priority
  const recentProjects = getRecentProjects();
  const recentIndex = recentProjects.indexOf(project._id);
  if (recentIndex !== -1) {
    score += 500 - (recentIndex * 100); // More recent = higher score
  }
  
  // Projects created by user get some priority
  if (userId && project.createdBy === userId) {
    score += 200;
  }
  
  // More recent updates get slight priority
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  score += Math.max(0, 100 - daysSinceUpdate);
  
  return score;
}

/**
 * Sort projects by priority (favorites, recent, user-created, etc.)
 */
export function sortProjectsByPriority(projects: Project[], userId?: string): Project[] {
  return [...projects].sort((a, b) => {
    const scoreA = getProjectPriorityScore(a, userId);
    const scoreB = getProjectPriorityScore(b, userId);
    return scoreB - scoreA;
  });
}

export const favoriteProjectUtils: FavoriteProjectUtils = {
  getFavoriteProjects,
  setFavoriteProjects,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getCurrentFavorite,
  hasFavorite,
  getAutoSelectProject,
  clearFavorites,
};
