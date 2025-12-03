import React, { useState } from 'react';
import { Category } from '@/types';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory?: (name: string, color: string, type: Category['type']) => void;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [newCategoryType, setNewCategoryType] = useState<Category['type']>('other');

  const handleAddCategory = () => {
    if (newCategoryName.trim() && onAddCategory) {
      onAddCategory(newCategoryName.trim(), newCategoryColor, newCategoryType);
      setNewCategoryName('');
      setNewCategoryColor('#6366f1');
      setNewCategoryType('other');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-gray-700">
        Select Category
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`flex items-center p-4 rounded-xl transition-all duration-150 ${selectedCategoryId === category.id
              ? 'ring-2 ring-offset-2 ring-gray-400 shadow-sm'
              : 'hover:shadow-sm hover:bg-gray-50'
              }`}
            style={{ backgroundColor: `${category.color}15` }}
          >
            <div
              className="w-5 h-5 rounded-full mr-3"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {isAdding ? (
        <div className="space-y-4 p-5 bg-white rounded-xl border border-slate-200">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              placeholder="e.g., Deep Work, Exercise"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Color</label>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value as Category['type'])}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all"
              >
                <option value="productive">Productive</option>
                <option value="rest">Rest</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleAddCategory}
              className="flex-1 px-5 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add Category
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center w-full p-4 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-slate-200"
        >
          <span className="mr-2 text-lg">+</span>
          Add New Category
        </button>
      )}
    </div>
  );
};

export default CategoryPicker;