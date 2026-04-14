import React, { useState, useEffect } from 'react';
import { listFiles, uploadFile } from '../api';
import { Folder, File, Upload, ChevronRight } from 'lucide-react';

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path) => {
    try {
      const data = await listFiles(path);
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files', error);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await uploadFile(file, currentPath);
      loadFiles(currentPath);
    } catch (error) {
      console.error('Failed to upload file', error);
    }
  };

  const handleNavigate = (path) => {
    setCurrentPath(path);
  };

  const handleUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">File Manager</h1>
        <div className="relative">
          <input
            type="file"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700"
          >
            <Upload size={18} className="mr-2" /> Upload
          </label>
        </div>
      </div>

      <div className="flex items-center mb-4 text-sm text-gray-500 bg-gray-100 p-2 rounded">
        <button onClick={() => setCurrentPath('')} className="hover:text-blue-600">Home</button>
        {currentPath.split('/').filter(Boolean).map((part, index, arr) => (
          <React.Fragment key={index}>
            <ChevronRight size={16} className="mx-1" />
            <button
              onClick={() => handleNavigate(arr.slice(0, index + 1).join('/'))}
              className="hover:text-blue-600"
            >
              {part}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPath && (
              <tr
                onClick={handleUp}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4"><Folder size={20} className="text-blue-400" /></td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">..</td>
                <td className="px-6 py-4"></td>
              </tr>
            )}
            {files.map((file) => (
              <tr
                key={file.name}
                onClick={() => file.is_dir && handleNavigate(file.path)}
                className={`hover:bg-gray-50 ${file.is_dir ? 'cursor-pointer' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {file.is_dir ? (
                    <Folder size={20} className="text-yellow-500" />
                  ) : (
                    <File size={20} className="text-gray-400" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {file.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {file.is_dir ? '-' : `${(file.size / 1024).toFixed(1)} KB`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
