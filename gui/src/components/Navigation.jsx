import { Link, useLocation } from 'react-router-dom'

const Navigation = () => {
  const location = useLocation()

  const navItems = [
    {
      path: '/',
      label: 'Research',
      icon: '🔬',
      description: 'Create new research projects'
    },
    {
      path: '/knowledge',
      label: 'Knowledge Base',
      icon: '🧠',
      description: 'Explore all projects, search, and analytics'
    }
  ]

  // Show editor tab only if we're on an editor page
  const isEditorPage = location.pathname.includes('/edit')
  
  if (isEditorPage) {
    navItems.push({
      path: location.pathname,
      label: 'Report Editor',
      icon: '✏️',
      description: 'WYSIWYG report editor'
    })
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="text-2xl">🧠</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OpenResearch</h1>
                <p className="text-xs text-gray-500">AI-Powered Research Platform</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title={item.description}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-3">
            <div className="text-xs text-gray-500">
              {import.meta.env.VITE_WORKER_API_URL ? (
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Cloud Connected</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Local Mode</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation