import React, { useState } from 'react';
import { getKeycloakToken, getKeycloakUsers } from '../api_keycloak';
import { Key, Users, Search, RefreshCw } from 'lucide-react';

export default function ToolboxPage() {
  const [activeTab, setActiveTab] = useState('keycloak');
  const [token, setToken] = useState('');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetToken = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getKeycloakToken();
      setToken(data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get token');
    } finally {
      setLoading(false);
    }
  };

  const handleGetUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getKeycloakUsers(userSearch);
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Toolbox</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 ${activeTab === 'keycloak' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('keycloak')}
        >
          Keycloak Manager
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'fhir' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('fhir')}
        >
          FHIR Utilities (Pending)
        </button>
      </div>

      {activeTab === 'keycloak' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Utility */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Key size={20} className="mr-2 text-yellow-600" /> Token Generator
            </h2>
            <div className="mb-4 text-sm text-gray-600">
              Generates a Client Credentials token using the configured settings.
            </div>
            <button
              onClick={handleGetToken}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading && <RefreshCw size={16} className="animate-spin mr-2" />}
              Get Admin Token
            </button>
            {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
            {token && (
              <div className="mt-4 p-3 bg-gray-100 rounded break-all text-xs font-mono border border-gray-300">
                {token}
              </div>
            )}
          </div>

          {/* User Browser */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Users size={20} className="mr-2 text-purple-600" /> User Browser
            </h2>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                placeholder="Search username..."
                className="border p-2 rounded flex-1"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <button
                onClick={handleGetUsers}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                <Search size={18} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-64 border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Username</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Enabled</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{user.username}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{user.email || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {user.enabled ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan="3" className="px-4 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
