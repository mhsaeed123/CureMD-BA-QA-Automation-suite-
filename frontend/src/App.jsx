import { useState, useEffect } from 'react'
import './index.css'

// Import pages
import FileManager from './pages/FileManager'
import MappingBotPage from './pages/MappingBotPage'
import SettingsPage from './pages/SettingsPage'
import ToolboxPage from './pages/ToolboxPage'
import SuperAppPage from './pages/SuperAppPage'

function App() {
  const [currentPage, setCurrentPage] = useState('superapp')
  const [taskInput, setTaskInput] = useState('')
  const [tasks, setTasks] = useState([])
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const API_BASE = 'http://localhost:8000'

  // Render page content
  const renderPage = () => {
    switch (currentPage) {
      case 'superapp':
        return (
          <SuperAppPage 
            taskInput={taskInput}
            setTaskInput={setTaskInput}
            tasks={tasks}
            setTasks={setTasks}
            output={output}
            setOutput={setOutput}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            runTask={runTask}
            API_BASE={API_BASE}
          />
        )
      case 'filemanager':
        return <FileManager />
      case 'mappingbot':
        return <MappingBotPage />
      case 'toolbox':
        return <ToolboxPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <SuperAppPage />
    }
  }

  const runTask = async () => {
    if (!taskInput.trim()) return
    setIsLoading(true)
    setOutput('🚀 Processing task...\n')
    
    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput })
      })
      const data = await response.json()
      setOutput(JSON.stringify(data, null, 2))
      setTasks([...tasks, { id: data.task_id, task: taskInput, status: 'completed' }])
    } catch (err) {
      setOutput(`Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <h1>🚀 SuperApp</h1>
          <p>Billion Dollar AI</p>
        </div>
        
        <nav>
          <button 
            className={currentPage === 'superapp' ? 'active' : ''} 
            onClick={() => setCurrentPage('superapp')}
          >
            🏠 Super App
          </button>
          <button 
            className={currentPage === 'filemanager' ? 'active' : ''} 
            onClick={() => setCurrentPage('filemanager')}
          >
            📁 Files
          </button>
          <button 
            className={currentPage === 'mappingbot' ? 'active' : ''} 
            onClick={() => setCurrentPage('mappingbot')}
          >
            🤖 Mapping Bot
          </button>
          <button 
            className={currentPage === 'toolbox' ? 'active' : ''} 
            onClick={() => setCurrentPage('toolbox')}
          >
            🧰 Toolbox
          </button>
          <button 
            className={currentPage === 'settings' ? 'active' : ''} 
            onClick={() => setCurrentPage('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>v2.0.0</p>
          <p>16,509+ Features</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
