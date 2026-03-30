import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { Task, Sprint, Project } from '@/utils/types';
import { useTasks } from './use-tasks';
import { useSprints } from './use-sprints';
import { API_ENDPOINTS } from '@/utils/constants';
import { useProjects } from './use-projects';
import { useEmployees } from './use-employees';

export interface AnalyticsData {
  // Overview metrics
  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageTaskDuration: number;
  };
  
  // Sprint analytics
  sprints: {
    totalSprints: number;
    activeSprints: number;
    completedSprints: number;
    averageVelocity: number;
    velocityTrend: Array<{ sprint: string; velocity: number; date: string }>;
    burndownData: Array<{ date: string; ideal: number; actual: number }>;
  };
  
  // Team performance
  team: {
    productivity: number;
    taskDistribution: Array<{
      member: string;
      memberName: string;
      memberEmail: string;
      tasks: number;
      completed: number;
    }>;
    workload: Array<{ member: string; storyPoints: number; capacity: number }>;
  };
  
  // Time analytics
  time: {
    dailyProgress: Array<{ date: string; completed: number; created: number }>;
    weeklyTrends: Array<{ week: string; velocity: number; tasks: number }>;
    monthlyStats: Array<{ month: string; completed: number; created: number }>;
  };
  
  // Quality metrics
  quality: {
    defectRate: number;
    reworkRate: number;
    cycleTime: number;
    leadTime: number;
  };
}

export function useAnalytics(projectId?: string, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
  return useQuery({
    queryKey: ['analytics', { projectId, timeRange }],
    queryFn: async () => {
      const params = { projectId, timeRange };
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.BASE, { params });
      return response.data.data as AnalyticsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

const getDateRange = (timeRange: '7d' | '30d' | '90d' | '1y') => {
  const now = new Date();
  const startDate = new Date();
  switch (timeRange) {
    case '7d': startDate.setDate(now.getDate() - 7); break;
    case '30d': startDate.setDate(now.getDate() - 30); break;
    case '90d': startDate.setDate(now.getDate() - 90); break;
    case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
  }
  return { startDate, now };
};

const filterTasksByProject = (tasks: Task[], projectId?: string) => {
  if (!projectId) return tasks;
  return tasks.filter(
    (task) =>
      task.projectId === projectId ||
      (task.project && typeof task.project === 'object' && task.project._id === projectId) ||
      (task.project && typeof task.project === 'string' && task.project === projectId)
  ) as Task[];
};

const filterSprintsByProject = (sprints: Sprint[], projectId?: string) => {
  if (!projectId) return sprints;
  return sprints.filter(
    (sprint) =>
      sprint.projectId === projectId ||
      (sprint.project && typeof sprint.project === 'object' && sprint.project._id === projectId) ||
      (sprint.project && typeof sprint.project === 'string' && sprint.project === projectId)
  ) as Sprint[];
};

// Computed analytics from existing data
export function useComputedAnalytics(projectId?: string, timeRange: '7d' | '30d' | '90d' | '1y' = '30d', assigneeId?: string) {
  const { data: tasksData } = useTasks();
  const { data: sprintsData } = useSprints();
  const { data: projectsData } = useProjects();
  const { data: employeesData } = useEmployees();

  const allTasks = tasksData || [];
  const allSprints = sprintsData || [];
  const allProjects = projectsData || [];
  const allEmployees = employeesData || [];

  return useMemo(() => {

    const { startDate, now } = getDateRange(timeRange);

    // Filter data by project if specified
    let tasks = filterTasksByProject(allTasks, projectId);

    // Filter by assignee if specified
    if (assigneeId) {
      tasks = tasks.filter(task => {
        const tAssigneeId = typeof task.assignee === 'object' ? task.assignee?._id : task.assignee;
        return tAssigneeId === assigneeId;
      });
    }

    // Filter tasks by time range
    tasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startDate && taskDate <= now;
    });

    let sprints = filterSprintsByProject(allSprints, projectId);

    // Filter sprints by time range
    sprints = sprints.filter(sprint => {
      const sprintDate = new Date(sprint.createdAt);
      return sprintDate >= startDate && sprintDate <= now;
    });

    // Overview metrics
    const completedTasks = tasks.filter(task => task.status === 'Done');
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress');
    const overdueTasks = tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done'
    );
    
    const completionRate = tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100) 
      : 0;

    // Calculate average task duration
    const tasksWithDuration = completedTasks.filter(task => 
      task.createdAt && task.updatedAt
    );
    const averageTaskDuration = tasksWithDuration.length > 0
      ? tasksWithDuration.reduce((sum, task) => {
          const duration = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime();
          return sum + duration / (1000 * 60 * 60 * 24); // Convert to days
        }, 0) / tasksWithDuration.length
      : 0;

    // Sprint analytics
    const activeSprints = sprints.filter(sprint => sprint.status === 'Active');
    const completedSprints = sprints.filter(sprint => sprint.status === 'Completed');
    
    const velocityData = completedSprints.map(sprint => ({
      sprint: sprint.title,
      velocity: sprint.velocity || 0,
      date: sprint.endDate
    }));
    
    const averageVelocity = velocityData.length > 0
      ? velocityData.reduce((sum, data) => sum + data.velocity, 0) / velocityData.length
      : 0;

    // Team performance (simplified - would need user data)
    const tasksByAssignee = tasks.reduce((acc, task) => {
      const assigneeId = typeof task.assignee === 'object' 
        ? task.assignee?._id 
        : task.assignee;
      
      if (assigneeId) {
        if (!acc[assigneeId]) {
          acc[assigneeId] = { total: 0, completed: 0 };
        }
        acc[assigneeId].total++;
        if (task.status === 'Done') {
          acc[assigneeId].completed++;
        }
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    const teamProductivity = Object.keys(tasksByAssignee).length > 0
      ? Object.values(tasksByAssignee).reduce((sum, member) => 
          sum + (member.completed / member.total), 0
        ) / Object.keys(tasksByAssignee).length * 100
      : 0;

    // Time analytics
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyProgress = last30Days.map(date => {
      const dayTasks = tasks.filter(task => 
        task.updatedAt && task.updatedAt.startsWith(date)
      );
      const completed = dayTasks.filter(task => task.status === 'Done').length;
      const created = tasks.filter(task => 
        task.createdAt && task.createdAt.startsWith(date)
      ).length;
      
      return { date, completed, created };
    });

    // Priority distribution
    const priorityDistribution = ['Critical', 'High', 'Medium', 'Low'].map(priority => ({
      label: priority,
      value: tasks.filter(task => task.priority === priority).length,
      color: priority === 'Critical' ? '#ef4444' :
             priority === 'High' ? '#f97316' :
             priority === 'Medium' ? '#eab308' : '#22c55e'
    }));

    // Status distribution
    const statusDistribution = ['Backlog', 'To Do', 'In Progress', 'Review and Testing', 'Done'].map(status => ({
      label: status,
      value: tasks.filter(task => task.status === status).length,
      color: status === 'Done' ? '#22c55e' :
             status === 'In Progress' ? '#3b82f6' :
             status === 'Review and Testing' ? '#8b5cf6' :
             status === 'To Do' ? '#f59e0b' : '#6b7280'
    }));

    // Sprint burndown for active sprint
    const activeSprint = activeSprints[0];
    let burndownData: Array<{ date: string; ideal: number; actual: number }> = [];
    
    if (activeSprint) {
      const sprintTasks = tasks.filter(task => 
        typeof task.sprintId === 'string' 
          ? task.sprintId === activeSprint._id
          : task.sprintId?._id === activeSprint._id
      );
      
      const totalStoryPoints = sprintTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
      const startDate = new Date(activeSprint.startDate);
      const endDate = new Date(activeSprint.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      burndownData = Array.from({ length: totalDays + 1 }, (_, i) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        const ideal = totalStoryPoints - (totalStoryPoints * i / totalDays);
        
        // Simulate actual progress (in real app, this would be calculated from task completion dates)
        const progressRate = Math.min(i / totalDays, 1) * 0.8; // 80% of ideal progress
        const actual = totalStoryPoints - (totalStoryPoints * progressRate);
        
        return {
          date: currentDate.toISOString().split('T')[0],
          ideal: Math.max(0, ideal),
          actual: Math.max(0, actual)
        };
      });
    }

    return {
      overview: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate,
        averageTaskDuration: Math.round(averageTaskDuration * 10) / 10
      },
      sprints: {
        totalSprints: sprints.length,
        activeSprints: activeSprints.length,
        completedSprints: completedSprints.length,
        averageVelocity: Math.round(averageVelocity),
        velocityTrend: velocityData.slice(-10), // Last 10 sprints
        burndownData
      },
      team: {
        productivity: Math.round(teamProductivity),
        taskDistribution: Object.entries(tasksByAssignee).map(([id, data]) => {
          const employee = allEmployees.find(emp => emp._id === id);
          const memberName = employee
            ? (employee.firstName && employee.lastName
                ? `${employee.firstName} ${employee.lastName}`
                : employee.email?.split('@')[0] || 'Unknown User')
            : `Member ${id.slice(-4)}`;

          return {
            member: id,
            memberName,
            memberEmail: employee?.email || '',
            tasks: data.total,
            completed: data.completed
          };
        }),
        workload: [] // Would need capacity data
      },
      time: {
        dailyProgress,
        weeklyTrends: [], // Would need more complex calculation
        monthlyStats: [] // Would need more complex calculation
      },
      quality: {
        defectRate: 0, // Would need bug tracking
        reworkRate: 0, // Would need task revision tracking
        cycleTime: averageTaskDuration,
        leadTime: averageTaskDuration * 1.2 // Estimate
      },
      charts: {
        priorityDistribution,
        statusDistribution,
        velocityTrend: velocityData.map(v => ({ x: v.date, y: v.velocity, label: v.sprint })),
        burndown: burndownData.map(d => ({ date: d.date, ideal: d.ideal, actual: d.actual }))
      }
    };
  }, [allTasks, allSprints, allProjects, projectId, timeRange]);
}

// Specific analytics hooks
export function useVelocityAnalytics(projectId?: string, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
  const { data: sprints = [] } = useSprints();
  
  return useMemo(() => {
    const { startDate, now } = getDateRange(timeRange);

    let projectSprints = filterSprintsByProject(sprints, projectId);

    // Filter by time range
    projectSprints = projectSprints.filter(sprint => {
      const sprintDate = new Date(sprint.createdAt);
      return sprintDate >= startDate && sprintDate <= now;
    });
    
    const completedSprints = projectSprints.filter(sprint => sprint.status === 'Completed');
    
    const velocityData = completedSprints
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .map(sprint => ({
        sprint: sprint.title,
        velocity: sprint.velocity ?? 0,
        capacity: sprint.capacity ?? 0,
        date: sprint.endDate,
        efficiency: (sprint.capacity ?? 0) > 0 ? ((sprint.velocity ?? 0) / (sprint.capacity ?? 1)) * 100 : 0
      }));
    
    const averageVelocity = velocityData.length > 0
      ? velocityData.reduce((sum, data) => sum + data.velocity, 0) / velocityData.length
      : 0;
    
    const averageEfficiency = velocityData.length > 0
      ? velocityData.reduce((sum, data) => sum + data.efficiency, 0) / velocityData.length
      : 0;
    
    return {
      velocityData,
      averageVelocity: Math.round(averageVelocity),
      averageEfficiency: Math.round(averageEfficiency),
      trend: velocityData.length > 1 
        ? velocityData[velocityData.length - 1].velocity - velocityData[velocityData.length - 2].velocity
        : 0
    };
  }, [sprints, projectId, timeRange]);
}

export function useTaskAnalytics(projectId?: string, timeRange: '7d' | '30d' | '90d' | '1y' = '30d', assigneeId?: string) {
  const { data: tasks = [] } = useTasks();
  
  return useMemo(() => {
    const { startDate, now } = getDateRange(timeRange);

    let projectTasks = filterTasksByProject(tasks, projectId);

    // Filter by assignee if specified
    if (assigneeId) {
      projectTasks = projectTasks.filter(task => {
        const tAssigneeId = typeof task.assignee === 'object' ? task.assignee?._id : task.assignee;
        return tAssigneeId === assigneeId;
      });
    }

    // Filter by time range
    projectTasks = projectTasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startDate && taskDate <= now;
    });
    
    // Task completion trends
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    const completionTrend = last7Days.map(date => {
      const completed = projectTasks.filter(task =>
        task.updatedAt && 
        task.updatedAt.startsWith(date) && 
        task.status === 'Done'
      ).length;
      
      return { date, completed };
    });
    
    // Task type distribution
    const typeDistribution = ['Story', 'Bug', 'Task', 'Epic'].map(type => ({
      label: type,
      value: projectTasks.filter(task => task.type === type).length,
      color: type === 'Story' ? '#3b82f6' :
             type === 'Bug' ? '#ef4444' :
             type === 'Task' ? '#22c55e' : '#8b5cf6'
    }));
    
    return {
      completionTrend,
      typeDistribution,
      totalTasks: projectTasks.length,
      completedTasks: projectTasks.filter(task => task.status === 'Done').length,
      averageStoryPoints: projectTasks.length > 0
        ? projectTasks.reduce((sum, task) => sum + (task.storyPoints || 0), 0) / projectTasks.length
        : 0
    };
  }, [tasks, projectId, timeRange]);
}
