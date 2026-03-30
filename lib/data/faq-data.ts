// FAQ data for Flotick - Comprehensive questions and answers
import type { FAQItem } from '@/lib/seo/schema-generator';

export const faqData: FAQItem[] = [
  // Getting Started
  {
    question: 'What is Flotick?',
    answer: 'Flotick is a unified work management platform that combines task tracking, sprint planning, and team attendance into one system. Unlike improving disjointed tools, Flotick helps growing teams plan work, manage people, and track execution in a single shared workspace.',
  },
  {
    question: 'How is Flotick different from Asana or replacement tools?',
    answer: 'While traditional tools focus only on tasks, Flotick is organization-first. It natively integrates "People" management (Attendance, Directory, Roles) with "Work" management (Tasks, Sprints). This gives you visibility into not just *what* is being done, but *who* is available to do it.',
  },
  {
    question: 'Is Flotick free to use?',
    answer: 'Yes, Flotick offers a robust Free Forever plan for small teams. It includes essential features like unlimited tasks, sprint planning, and basic attendance tracking. Pro and Enterprise plans are available for larger teams needing advanced analytics and permissions.',
  },
  {
    question: 'How do I create a Flotick account?',
    answer: 'Visit the sign-up page and enter your email or use single sign-on (Google). Once inside, you can create a "Workspace" for your organization and immediately invite team members to join.',
  },

  // Features
  {
    question: 'Does Flotick support Agile and Sprints?',
    answer: 'Yes. Flotick allows you to organize work into timed Sprints or Cycles. You can track velocity, manage backlogs, and view sprint progress without the complexity of enterprise-heavy agile tools.',
  },
  {
    question: 'How does attendance tracking work in Flotick?',
    answer: 'Team members can check in/out directly from their dashboard. Managers get a real-time view of who is online (Office vs. Remote) and can pull attendance reports for payroll or capacity planning—all without leaving the work platform.',
  },
  {
    question: 'How do I create tasks in Flotick?',
    answer: 'Navigate to a Project and click "New Task". You can assign details like Priority, Due Date, and Assignee. Tasks can be viewed in Lists, Kanban Boards, or Calendars depending on your workflow preference.',
  },
  {
    question: 'Can I integrate Flotick with other tools?',
    answer: 'Yes. Flotick supports integrations with development tools (GitHub/GitLab) and communication platforms (Slack). You can also use our API to build custom workflows for your specific team needs.',
  },
  {
    question: 'Does Flotick have a mobile app?',
    answer: 'Flotick is fully responsive for mobile browsers, allowing you to track tasks and check in for attendance on the go. Native mobile apps for iOS and Android are on our roadmap.',
  },

  // Pricing & Plans
  {
    question: 'How much does Flotick cost?',
    answer: 'Flotick has three tiers: Free (0$/mo for small teams), Pro ($10/user/mo for growing teams), and Enterprise ($25/user/mo for large organizations). Annual billing offers additional discounts.',
  },
  {
    question: "What's included in the Flotick free plan?",
    answer: 'The Free plan allows for unlimited tasks, up to 3 active projects, and attendance tracking for up to 10 members. It is designed to let startups run their entire operation without cost barriers.',
  },
  {
    question: 'Can I upgrade my Flotick plan anytime?',
    answer: 'Yes. You can upgrade from Free to Pro or Enterprise at any time from your Billing settings. Changes are immediate, and prorated charges will apply for the remainder of the billing cycle.',
  },
  {
    question: 'Do you offer discounts for nonprofits?',
    answer: 'Yes, we support nonprofits and educational institutions with special discounted pricing. Contact our sales team with your organization details to apply.',
  },

  // Technical & Security
  {
    question: 'Is Flotick secure?',
    answer: 'Yes. We use industry-standard encryption (TLS/SSL) for data in transit and at rest. Our infrastructure is hosted on secure professional cloud providers with regular backups and security audits.',
  },
  {
    question: 'Where is my Flotick data stored?',
    answer: 'Data is stored in secure data centers with redundancy and failover protection. We prioritize data privacy and do not sell user data to third parties.',
  },
  {
    question: 'Can I export my data from Flotick?',
    answer: 'Yes. You retain full ownership of your data. You can export tasks, projects, and attendance logs to CSV or JSON formats at any time for backup or analysis.',
  },

  // Collaboration
  {
    question: 'How many team members can I invite?',
    answer: 'The Free plan supports up to 10 members. Pro and Enterprise plans allow for unlimited team member invitations.',
  },
  {
    question: 'Can I set different permissions for team members?',
    answer: 'Yes. Flotick uses role-based access control (RBAC). You can assign roles like Admin, Manager, Member, or Viewer to control what users can see and do within your workspace.',
  },
  {
    question: 'How do notifications work?',
    answer: 'You can customize notifications for task updates, mentions, and due dates. Alerts can be delivered via email, in-app notification center, or Slack.',
  },
];

// Categorized FAQ data for better organization
export const faqCategories = {
  'Getting Started': faqData.slice(0, 4),
  'Features': faqData.slice(4, 9),
  'Pricing & Plans': faqData.slice(9, 13),
  'Technical & Security': faqData.slice(13, 17),
  'Collaboration': faqData.slice(17, 20),
};
