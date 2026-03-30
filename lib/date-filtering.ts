/**
 * Comprehensive date filtering utilities for task management
 * Provides precise date comparison logic with proper timezone handling
 */

export type DateFilterType = 'today' | 'tomorrow' | 'next7days' | 'overdue' | 'all';

/**
 * Get a date with time set to midnight (start of day) in local timezone
 */
function getDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get today's date at midnight
 */
export function getToday(): Date {
  return getDateOnly(new Date());
}

/**
 * Get tomorrow's date at midnight
 */
export function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDateOnly(tomorrow);
}

/**
 * Get the date 7 days from today at midnight
 */
export function getNext7DaysEnd(): Date {
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);
  return getDateOnly(next7Days);
}

/**
 * Get the day after tomorrow (start of "Next 7 Days" range)
 */
export function getDayAfterTomorrow(): Date {
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return getDateOnly(dayAfterTomorrow);
}

/**
 * Check if a task is due today
 */
export function isTaskDueToday(task: { dueDate?: string | Date }): boolean {
  if (!task.dueDate) return false;
  
  const taskDate = getDateOnly(new Date(task.dueDate));
  const today = getToday();
  
  return taskDate.getTime() === today.getTime();
}

/**
 * Check if a task is due tomorrow
 */
export function isTaskDueTomorrow(task: { dueDate?: string | Date }): boolean {
  if (!task.dueDate) return false;
  
  const taskDate = getDateOnly(new Date(task.dueDate));
  const tomorrow = getTomorrow();
  
  return taskDate.getTime() === tomorrow.getTime();
}

/**
 * Check if a task is due in the next 7 days (excluding today and tomorrow)
 */
export function isTaskDueNext7Days(task: { dueDate?: string | Date }): boolean {
  if (!task.dueDate) return false;
  
  const taskDate = getDateOnly(new Date(task.dueDate));
  const dayAfterTomorrow = getDayAfterTomorrow();
  const next7DaysEnd = getNext7DaysEnd();
  
  return taskDate >= dayAfterTomorrow && taskDate <= next7DaysEnd;
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: { dueDate?: string | Date; status?: string }): boolean {
  if (!task.dueDate || task.status === 'Done') return false;
  
  const taskDate = getDateOnly(new Date(task.dueDate));
  const today = getToday();
  
  return taskDate < today;
}

/**
 * Filter tasks by date category with precise logic
 */
export function filterTasksByDateCategory(
  tasks: Array<{ dueDate?: string | Date; status?: string }>, 
  category: DateFilterType
): Array<{ dueDate?: string | Date; status?: string }> {
  switch (category) {
    case 'today':
      return tasks.filter(isTaskDueToday);
    
    case 'tomorrow':
      return tasks.filter(isTaskDueTomorrow);
    
    case 'next7days':
      return tasks.filter(isTaskDueNext7Days);
    
    case 'overdue':
      return tasks.filter(isTaskOverdue);
    
    case 'all':
    default:
      return tasks;
  }
}

/**
 * Get a human-readable description of the date filter
 */
export function getDateFilterDescription(category: DateFilterType, taskCount: number): string {
  switch (category) {
    case 'today':
      return `${taskCount} task${taskCount !== 1 ? 's' : ''} due today`;
    
    case 'tomorrow':
      return `${taskCount} task${taskCount !== 1 ? 's' : ''} due tomorrow`;
    
    case 'next7days':
      return `${taskCount} task${taskCount !== 1 ? 's' : ''} due in next 7 days (excluding today & tomorrow)`;
    
    case 'overdue':
      return `${taskCount} overdue task${taskCount !== 1 ? 's' : ''}`;
    
    case 'all':
    default:
      return `${taskCount} task${taskCount !== 1 ? 's' : ''} total`;
  }
}

/**
 * Get date range information for debugging/logging
 */
export function getDateRangeInfo() {
  const today = getToday();
  const tomorrow = getTomorrow();
  const dayAfterTomorrow = getDayAfterTomorrow();
  const next7DaysEnd = getNext7DaysEnd();
  
  return {
    today: today.toDateString(),
    tomorrow: tomorrow.toDateString(),
    dayAfterTomorrow: dayAfterTomorrow.toDateString(),
    next7DaysEnd: next7DaysEnd.toDateString(),
    ranges: {
      today: `${today.toDateString()}`,
      tomorrow: `${tomorrow.toDateString()}`,
      next7Days: `${dayAfterTomorrow.toDateString()} to ${next7DaysEnd.toDateString()}`,
      overdue: `Before ${today.toDateString()}`
    }
  };
}

/**
 * Test the date filtering logic with specific examples
 * Useful for debugging and verification
 */
export function testDateFiltering(testDate: string = '2024-08-22') {
  console.log('🧪 Testing Date Filtering Logic');
  console.log('='.repeat(50));
  
  const ranges = getDateRangeInfo();
  console.log('📅 Date Ranges:', ranges);
  
  // Test with specific dates
  const testCases = [
    { dueDate: testDate, description: 'Test date (should be today)' },
    { dueDate: '2024-08-23', description: 'Tomorrow' },
    { dueDate: '2024-08-24', description: 'Day after tomorrow (start of next 7 days)' },
    { dueDate: '2024-08-29', description: 'End of next 7 days range' },
    { dueDate: '2024-08-21', description: 'Yesterday (overdue)' },
    { dueDate: '2024-08-30', description: 'Beyond 7 days' }
  ];
  
  // Test results are only logged in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🔍 Test Results:');
    testCases.forEach(testCase => {
      const results = {
        today: isTaskDueToday(testCase),
        tomorrow: isTaskDueTomorrow(testCase),
        next7days: isTaskDueNext7Days(testCase),
        overdue: isTaskOverdue(testCase)
      };

      console.log(`${testCase.dueDate} (${testCase.description}):`, results);
    });
  }
}
