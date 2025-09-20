
import { Project } from '../types';

// FIX: Updated mock data to conform to the Project type.
// The `modified` property does not exist; replaced with `updated_at`.
// Added required `user_id` and `created_at` properties.
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const overOneYearAgo = new Date();
overOneYearAgo.setFullYear(overOneYearAgo.getFullYear() - 1);
overOneYearAgo.setDate(overOneYearAgo.getDate() - 1);


export const mockProjects: Project[] = [
  {
    id: '1',
    user_id: 'mock-user-id',
    name: 'My First Game',
    description: 'A simple obby game to learn the basics of Roblox development.',
    status: 'In Progress',
    platform: 'Roblox Studio',
    updated_at: oneYearAgo.toISOString(),
    created_at: oneYearAgo.toISOString(),
  },
  {
    id: '2',
    user_id: 'mock-user-id',
    name: 'RPG Framework',
    description: 'A complex RPG system with inventory, quests, and combat.',
    status: 'In Progress',
    platform: 'Roblox Studio',
    updated_at: oneYearAgo.toISOString(),
    created_at: oneYearAgo.toISOString(),
  },
  {
    id: '3',
    user_id: 'mock-user-id',
    name: 'Shooter Test',
    description: 'Testing advanced weapon mechanics and networking.',
    status: 'Archived',
    platform: 'Roblox Studio',
    updated_at: overOneYearAgo.toISOString(),
    created_at: overOneYearAgo.toISOString(),
  },
];
