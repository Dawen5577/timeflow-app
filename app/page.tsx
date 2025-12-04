'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import DayTimeline from '@/components/DayTimeline';
import { Category, TimeBlock } from '@/types';

export default function Home() {
  // Mock categories data
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', user_id: 'user-1', name: 'Deep Work', color: '#6366f1', type: 'productive' },
    { id: '2', user_id: 'user-1', name: 'Meetings', color: '#8b5cf6', type: 'productive' },
    { id: '3', user_id: 'user-1', name: 'Rest', color: '#10b981', type: 'rest' },
    { id: '4', user_id: 'user-1', name: 'Entertainment', color: '#f59e0b', type: 'other' },
    { id: '5', user_id: 'user-1', name: 'Exercise', color: '#ec4899', type: 'productive' },
    { id: '6', user_id: 'user-1', name: 'Learning', color: '#3b82f6', type: 'productive' },
  ]);

  // Mock time blocks data
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([
    {
      id: '1',
      user_id: 'user-1',
      start_time: new Date(new Date().setHours(9, 0, 0)).toISOString(),
      end_time: new Date(new Date().setHours(10, 30, 0)).toISOString(),
      category_id: '1',
      notes: 'Worked on project documentation',
      mood_rating: 4,
    },
    {
      id: '2',
      user_id: 'user-1',
      start_time: new Date(new Date().setHours(11, 0, 0)).toISOString(),
      end_time: new Date(new Date().setHours(12, 0, 0)).toISOString(),
      category_id: '2',
      notes: 'Team sync meeting',
      mood_rating: 3,
    },
    {
      id: '3',
      user_id: 'user-1',
      start_time: new Date(new Date().setHours(13, 0, 0)).toISOString(),
      end_time: new Date(new Date().setHours(14, 0, 0)).toISOString(),
      category_id: '3',
      notes: 'Lunch break',
      mood_rating: 5,
    },
  ]);

  const handleSaveTimeBlock = (
    startTime: Date,
    endTime: Date,
    categoryId: string,
    notes?: string,
    moodRating?: number
  ) => {
    const newTimeBlock: TimeBlock = {
      id: `new-${Date.now()}`,
      user_id: 'user-1',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      category_id: categoryId,
      notes,
      mood_rating: moodRating,
    };

    setTimeBlocks(prev => [...prev, newTimeBlock]);
  };

  const handleAddCategory = (name: string, color: string, type: Category['type']) => {
    const newCategory: Category = {
      id: `new-${Date.now()}`,
      user_id: 'user-1',
      name,
      color,
      type,
    };

    setCategories(prev => [...prev, newCategory]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DayTimeline />
    </div>
  );
}
