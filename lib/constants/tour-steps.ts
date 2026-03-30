export type TourPage = 'dashboard' | 'projects' | 'sprints' | 'tasks';

export interface TourStep {
  element: string; // CSS selector or data-tour attribute
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
}

export interface PageTourConfig {
  page: TourPage;
  steps: TourStep[];
}

// Dashboard Tour - Focus on key workflow elements
export const dashboardTourSteps: TourStep[] = [
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: 'Quick Actions',
      description: 'Create new tasks, sprints, or projects with one click. This is your command center for getting things done quickly.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="attendance-card"]',
    popover: {
      title: 'Daily Attendance',
      description: 'Track your work hours by checking in when you start and checking out when you finish. Your daily timer shows time worked.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="stats-grid"]',
    popover: {
      title: 'Your Stats at a Glance',
      description: 'See your task metrics: total tasks assigned, completed, in progress, and team members. Stats update in real-time.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="task-tabs"]',
    popover: {
      title: 'Task Views',
      description: 'Switch between list view for your tasks or calendar view to see tasks by due date. Filter tasks by today, tomorrow, or overdue.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="task-list"]',
    popover: {
      title: 'Your Tasks',
      description: 'All your assigned tasks appear here. Click any task to view details, update status, or add comments.',
      side: 'top',
      align: 'center',
    },
  },
];

// Projects Tour
export const projectsTourSteps: TourStep[] = [
  {
    element: '[data-tour="projects-header"]',
    popover: {
      title: 'Projects Overview',
      description: 'This is where you manage all your organization\'s projects. Each project can have its own team, sprints, and tasks.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="create-project"]',
    popover: {
      title: 'Create New Project',
      description: 'Start a new project to organize your work. You can add team members, set deadlines, and configure visibility settings.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="projects-filters"]',
    popover: {
      title: 'Search & Filter',
      description: 'Quickly find projects by name, filter by your projects or favorites, and sort by different criteria.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="project-card"]',
    popover: {
      title: 'Project Cards',
      description: 'Click any project card to view details, manage team members, configure environments, and access project settings.',
      side: 'top',
      align: 'start',
    },
  },
];

// Sprints Tour
export const sprintsTourSteps: TourStep[] = [
  {
    element: '[data-tour="sprints-header"]',
    popover: {
      title: 'Sprint Management',
      description: 'Manage your agile sprints here. Sprints help you plan work in time-boxed iterations for better velocity tracking.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="create-sprint"]',
    popover: {
      title: 'Create Sprint',
      description: 'Start a new sprint by setting dates, capacity, and goals. Assign team members and track progress throughout.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="sprints-filters"]',
    popover: {
      title: 'Filter Sprints',
      description: 'Filter sprints by project or status (Planning, Active, Review, Completed) to focus on what matters.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="sprint-card"]',
    popover: {
      title: 'Sprint Cards',
      description: 'Each card shows sprint status, dates, capacity, and progress. Active sprints display a live progress bar.',
      side: 'top',
      align: 'start',
    },
  },
];

// Tasks Tour
export const tasksTourSteps: TourStep[] = [
  {
    element: '[data-tour="tasks-header"]',
    popover: {
      title: 'Task Management',
      description: 'View and manage all tasks across your projects. This is your central hub for tracking work items.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-filters"]',
    popover: {
      title: 'Powerful Filters',
      description: 'Filter tasks by status, priority, project, sprint, or assignee. Use search to find specific tasks quickly.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="create-task"]',
    popover: {
      title: 'Create Task',
      description: 'Add new tasks with title, description, priority, story points, and due dates. Assign to team members and add to sprints.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="task-card"]',
    popover: {
      title: 'Task Cards',
      description: 'Click any task to view full details, update status, add comments, attach files, and track history.',
      side: 'top',
      align: 'start',
    },
  },
];

// Tour configuration map
export const tourConfigs: Record<TourPage, TourStep[]> = {
  dashboard: dashboardTourSteps,
  projects: projectsTourSteps,
  sprints: sprintsTourSteps,
  tasks: tasksTourSteps,
};

// Get tour steps for a specific page
export const getTourSteps = (page: TourPage): TourStep[] => {
  return tourConfigs[page] || [];
};
