import { useState } from 'react'

function SuperAppPage({ taskInput, setTaskInput, tasks, setTasks, output, setOutput, isLoading, setIsLoading, runTask, API_BASE }) {
  const [activeTab, setActiveTab] = useState('chat')
  const [browseUrl, setBrowseUrl] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [memoryQuery, setMemoryQuery] = useState('')

  // Handle task submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!taskInput.trim()) return
    await runTask()
    setTaskInput('')
  }

  // Quick actions
  const quickActions = [
    { icon: '🌐', label: 'Browse', prompt: 'Browse https://' },
    { icon: '📝', label: 'Write Code', prompt: 'Write Python code to' },
    { icon: '🔍', label: 'Research', prompt: 'Research' },
    { icon: '🐛', label: 'Debug', prompt: 'Fix this bug' },
    { icon: '📊', label: 'Analyze', prompt: 'Analyze' },
    { icon: '🤖', label: 'Build Agent', prompt: 'Build an AI agent that can' },
    { icon: '📄', label: 'Write Docs', prompt: 'Write documentation for' },
    { icon: '🧪', label: 'Write Tests', prompt: 'Write unit tests for' },
  ]

  // Render tab content
  const renderTab = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <div className="chat-section">
            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>⚡ Quick Actions</h3>
              <div className="action-grid">
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => setTaskInput(action.prompt)}>
                    {action.icon} {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Input */}
            <form onSubmit={handleSubmit} className="task-form">
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="What would you like me to do? I can:
• Browse websites and automate browser tasks
• Write, edit, and debug code
• Research any topic
• Analyze documents and data
• Build AI agents
• And 16,509+ more features..."
                rows={4}
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? '⏳ Processing...' : '🚀 Execute Task'}
              </button>
            </form>

            {/* Output */}
            {output && (
              <div className="output-section">
                <h3>📤 Output</h3>
                <pre>{output}</pre>
              </div>
            )}
          </div>
        )
      
      case 'browse':
        return (
          <div className="browse-section">
            <h2>🌐 Browser Automation</h2>
            <p>Powered by Playwright + Vision Engine (LaVague-style)</p>
            
            <div className="browse-form">
              <input
                type="url"
                value={browseUrl}
                onChange={(e) => setBrowseUrl(e.target.value)}
                placeholder="Enter URL to browse..."
              />
              <button onClick={() => taskInput && runTask()}>Navigate</button>
            </div>
            
            <div className="browse-actions">
              <h3>Actions</h3>
              <div className="action-buttons">
                <button>Click Element</button>
                <button>Type Text</button>
                <button>Take Screenshot</button>
                <button>Extract Content</button>
                <button>Fill Form</button>
                <button>Wait For Element</button>
              </div>
            </div>
          </div>
        )
      
      case 'code':
        return (
          <div className="code-section">
            <h2>💻 Code Editor</h2>
            <p>Powered by aider-style SEARCH/REPLACE blocks</p>
            
            <textarea
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="// Write or paste your code here..."
              rows={15}
              className="code-editor"
            />
            
            <div className="code-actions">
              <button onClick={() => setTaskInput(`Execute this code:\n${codeInput}`)}>
                ▶️ Run Code
              </button>
              <button onClick={() => setTaskInput(`Explain this code:\n${codeInput}`)}>
                📖 Explain
              </button>
              <button onClick={() => setTaskInput(`Debug this code:\n${codeInput}`)}>
                🐛 Debug
              </button>
              <button onClick={() => setTaskInput(`Add tests for:\n${codeInput}`)}>
                🧪 Test
              </button>
            </div>
          </div>
        )
      
      case 'agents':
        return (
          <div className="agents-section">
            <h2>🤖 Multi-Agent System</h2>
            <p>Powered by OpenManus + MetaGPT + AutoGPT orchestration</p>
            
            <div className="agent-cards">
              <div className="agent-card">
                <h3>👔 Supervisor</h3>
                <p>Task decomposition and delegation</p>
                <button onClick={() => setTaskInput('Supervise: Build a web scraper')}>
                  Activate
                </button>
              </div>
              
              <div className="agent-card">
                <h3>💻 Coder</h3>
                <p>Code editing with SEARCH/REPLACE</p>
                <button onClick={() => setTaskInput('Write code for a REST API')}>
                  Activate
                </button>
              </div>
              
              <div className="agent-card">
                <h3>🔍 Researcher</h3>
                <p>Web search and content extraction</p>
                <button onClick={() => setTaskInput('Research AI agents')}>
                  Activate
                </button>
              </div>
              
              <div className="agent-card">
                <h3>🌐 Browser</h3>
                <p>Vision-based web automation</p>
                <button onClick={() => setTaskInput('Browse GitHub and find popular repos')}>
                  Activate
                </button>
              </div>
            </div>
          </div>
        )
      
      case 'memory':
        return (
          <div className="memory-section">
            <h2>🧠 Memory</h2>
            <p>Three-tier memory: Short-term, Vector, Persistent</p>
            
            <div className="memory-search">
              <input
                type="text"
                value={memoryQuery}
                onChange={(e) => setMemoryQuery(e.target.value)}
                placeholder="Search memory..."
              />
              <button onClick={() => setTaskInput(`Search memory for: ${memoryQuery}`)}>
                🔍 Search
              </button>
            </div>
            
            <div className="memory-stats">
              <div className="memory-stat">
                <h4>Buffer</h4>
                <p>Short-term conversation</p>
              </div>
              <div className="memory-stat">
                <h4>Vector</h4>
                <p>Semantic search</p>
              </div>
              <div className="memory-stat">
                <h4>Store</h4>
                <p>Persistent key-value</p>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="superapp-page">
      <div className="superapp-header">
        <h1>🚀 CureMD BA QA Super App</h1>
        <p>The Billion-Dollar AI Platform - ONE APP TO RULE THEM ALL</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
          💬 Chat
        </button>
        <button className={activeTab === 'browse' ? 'active' : ''} onClick={() => setActiveTab('browse')}>
          🌐 Browse
        </button>
        <button className={activeTab === 'code' ? 'active' : ''} onClick={() => setActiveTab('code')}>
          💻 Code
        </button>
        <button className={activeTab === 'agents' ? 'active' : ''} onClick={() => setActiveTab('agents')}>
          🤖 Agents
        </button>
        <button className={activeTab === 'memory' ? 'active' : ''} onClick={() => setActiveTab('memory')}>
          🧠 Memory
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {renderTab()}
      </div>

      {/* Task History */}
      {tasks.length > 0 && (
        <div className="task-history">
          <h3>📋 Recent Tasks</h3>
          <ul>
            {tasks.slice(-5).map((task) => (
              <li key={task.id}>
                <span className={`status ${task.status}`}>
                  {task.status === 'completed' ? '✅' : '⏳'}
                </span>
                {task.task}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SuperAppPage
