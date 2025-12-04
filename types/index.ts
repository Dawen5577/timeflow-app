export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  type: 'productive' | 'rest' | 'other';
}

export interface TimeBlock {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  category_id: string;
  notes?: string;
  mood_rating?: number;
  category?: Category;
}

export interface TimelineSlot {
  time: string;
  hour: number;
  minute: number;
  isSelected: boolean;
  isFilled: boolean;
  timeBlock?: TimeBlock;
}

export interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: Date;
  endTime: Date;
  onSave: (data: {
    categoryId: string;
    notes?: string;
    moodRating?: number;
  }) => void;
}
