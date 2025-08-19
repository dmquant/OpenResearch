import { useState } from 'react'

const ApiKeySetup = ({ onClose }) => {
  const [showInstructions, setShowInstructions] = useState(false)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              🔑 Gemini API Setup Required
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-600 text-lg">⚠️</span>
                <div>
                  <h3 className="font-medium text-yellow-800">API Key Not Found</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    To use the AI research planning features, you need to configure your Gemini API key.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Quick Setup:</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</span>
                  <div>
                    <p className="text-sm text-gray-700">
                      Get your free API key from{' '}
                      <a 
                        href="https://makersuite.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</span>
                  <div>
                    <p className="text-sm text-gray-700 mb-2">
                      Create a <code className="bg-gray-200 px-1 rounded text-xs">.env</code> file in your project root:
                    </p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      VITE_GEMINI_API_KEY=your_api_key_here<br/>
                      VITE_GEMINI_MODEL=gemini-2.5-flash
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</span>
                  <div>
                    <p className="text-sm text-gray-700">
                      Restart your development server: <code className="bg-gray-200 px-1 rounded text-xs">npm run dev</code>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showInstructions ? 'Hide' : 'Show'} detailed instructions
              </button>

              {showInstructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <h4 className="font-medium mb-2">Detailed Setup Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Click "Create API key" and select a project</li>
                    <li>Copy the generated API key</li>
                    <li>Create a <code>.env</code> file in your project root directory</li>
                    <li>Add your API key to the file as shown above</li>
                    <li>Restart your development server</li>
                  </ol>
                  <p className="mt-2 text-xs">
                    <strong>Note:</strong> The API key will be used client-side. For production, consider using a backend proxy.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                I'll set it up later
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh after setup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiKeySetup