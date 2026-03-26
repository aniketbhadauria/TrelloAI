import { v4 as uuidv4 } from 'uuid';

export const GRADIENTS = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

export const LABEL_COLORS = [
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
];

export const createInitialData = () => ({
  boards: [
    {
      id: uuidv4(),
      title: 'Product Roadmap',
      gradient: 'gradient-1',
      starred: true,
      createdAt: new Date().toISOString(),
      lists: [
        {
          id: uuidv4(), title: 'Backlog',
          cards: [
            { id: uuidv4(), title: 'User authentication system', description: 'Implement OAuth2 with Google and GitHub providers for secure sign-in', labels: [{ id: uuidv4(), text: 'Feature', color: '#8b5cf6' }], dueDate: null, createdAt: new Date().toISOString() },
            { id: uuidv4(), title: 'Database schema design', description: 'Design the PostgreSQL schema for users, teams, and projects', labels: [{ id: uuidv4(), text: 'Backend', color: '#3b82f6' }], dueDate: null, createdAt: new Date().toISOString() },
          ],
        },
        {
          id: uuidv4(), title: 'In Progress',
          cards: [
            { id: uuidv4(), title: 'Dashboard UI redesign', description: 'Modernize the dashboard with new analytics widgets and charts', labels: [{ id: uuidv4(), text: 'Design', color: '#ec4899' }, { id: uuidv4(), text: 'Frontend', color: '#06b6d4' }], dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), createdAt: new Date().toISOString() },
          ],
        },
        {
          id: uuidv4(), title: 'Review',
          cards: [
            { id: uuidv4(), title: 'API rate limiting', description: 'Add rate limiting middleware to prevent API abuse', labels: [{ id: uuidv4(), text: 'Security', color: '#ef4444' }], dueDate: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString() },
          ],
        },
        {
          id: uuidv4(), title: 'Done',
          cards: [
            { id: uuidv4(), title: 'Project setup & CI/CD', description: 'Configure build pipeline, linting, and automated deployments', labels: [{ id: uuidv4(), text: 'DevOps', color: '#10b981' }], dueDate: null, createdAt: new Date().toISOString() },
          ],
        },
      ],
    },
    {
      id: uuidv4(), title: 'Marketing Campaign', gradient: 'gradient-2', starred: false, createdAt: new Date().toISOString(),
      lists: [
        { id: uuidv4(), title: 'Ideas', cards: [{ id: uuidv4(), title: 'Social media content calendar', description: 'Plan weekly posts for Twitter, LinkedIn, and Instagram', labels: [{ id: uuidv4(), text: 'Content', color: '#f59e0b' }], dueDate: null, createdAt: new Date().toISOString() }] },
        { id: uuidv4(), title: 'In Progress', cards: [] },
        { id: uuidv4(), title: 'Completed', cards: [] },
      ],
    },
    {
      id: uuidv4(), title: 'Sprint #24', gradient: 'gradient-3', starred: false, createdAt: new Date().toISOString(),
      lists: [
        { id: uuidv4(), title: 'To Do', cards: [{ id: uuidv4(), title: 'Fix payment gateway timeout', description: 'Investigate and resolve the 30s timeout issue on Stripe webhooks', labels: [{ id: uuidv4(), text: 'Bug', color: '#ef4444' }, { id: uuidv4(), text: 'Urgent', color: '#f97316' }], dueDate: new Date(Date.now() + 2 * 86400000).toISOString(), createdAt: new Date().toISOString() }] },
        { id: uuidv4(), title: 'In Progress', cards: [] },
        { id: uuidv4(), title: 'Done', cards: [] },
      ],
    },
  ],
});
