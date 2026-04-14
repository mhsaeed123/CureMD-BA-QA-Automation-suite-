import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Bot, Database, Wrench } from 'lucide-react';
import SettingsPage from './pages/SettingsPage';
import FileManager from './pages/FileManager';
import ToolboxPage from './pages/ToolboxPage';
import MappingBotPage from './pages/MappingBotPage';

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to FHIRForge Automation Suite.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Mapping Assistant</h2>
          <p className="text-gray-600 mb-4">AI-powered FHIR mapping tool.</p>
          <Link to="/mapping" className="text-blue-600 hover:text-blue-800">Start Mapping &rarr;</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">File Manager</h2>
          <p className="text-gray-600 mb-4">Browse and upload files for processing.</p>
          <Link to="/files" className="text-blue-600 hover:text-blue-800">Open Files &rarr;</Link>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Toolbox</h2>
          <p className="text-gray-600 mb-4">Access Keycloak manager and FHIR utilities.</p>
          <Link to="/toolbox" className="text-blue-600 hover:text-blue-800">Open Toolbox &rarr;</Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white flex flex-col">
          <div className="p-4 text-xl font-bold border-b border-gray-800">FHIRForge</div>
          <nav className="flex-1 p-4 space-y-2">
            <Link to="/" className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link to="/mapping" className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded">
              <Bot size={20} />
              <span>Mapping Bot</span>
            </Link>
            <Link to="/pipeline" className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded">
              <Database size={20} />
              <span>Pipeline</span>
            </Link>
            <Link to="/toolbox" className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded">
              <Wrench size={20} />
              <span>Toolbox</span>
            </Link>
            <Link to="/files" className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded">
              <FileText size={20} />
              <span>Files</span>
            </Link>
            <Link to="/settings" className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded">
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mapping" element={<MappingBotPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="/toolbox" element={<ToolboxPage />} />
            <Route path="*" element={<div className="p-6">Page Under Construction</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
