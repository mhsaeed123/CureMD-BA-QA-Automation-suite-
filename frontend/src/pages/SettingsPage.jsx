import React, { useState, useEffect } from 'react';
import { getSettings, updateSetting, createSetting } from '../api';
import { Save, Plus } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const handleUpdate = async (key, value) => {
    try {
      await updateSetting(key, value);
      loadSettings();
    } catch (error) {
      console.error('Failed to update setting', error);
    }
  };

  const handleCreate = async () => {
    try {
      await createSetting({ key: newKey, value: newValue, category: newCategory });
      setNewKey('');
      setNewValue('');
      loadSettings();
    } catch (error) {
      console.error('Failed to create setting', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add New Setting</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Key (e.g., OPENAI_API_KEY)"
            className="border p-2 rounded"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            type="text"
            placeholder="Value"
            className="border p-2 rounded"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <input
            type="text"
            placeholder="Category"
            className="border p-2 rounded"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button onClick={handleCreate} className="bg-blue-600 text-white p-2 rounded flex items-center justify-center">
            <Plus size={18} className="mr-2" /> Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{setting.key}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <input
                    type="text"
                    defaultValue={setting.value}
                    onBlur={(e) => handleUpdate(setting.key, e.target.value)}
                    className="border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{setting.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
