const Header = () => {
  return (
    <header className="text-center border-b border-gray-200 pb-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        AI Research Planning Platform
      </h1>
      <p className="text-lg text-gray-600">
        Generate comprehensive research plans using Gemini AI
      </p>
      <div className="mt-4 flex justify-center items-center space-x-2 text-sm">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-blue-600 font-medium">Phase 1: AI Research Planning</span>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Powered by Google Gemini • Enter your topic to generate a research plan
      </div>
    </header>
  )
}

export default Header