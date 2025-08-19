import { useState, useEffect } from 'react'
import { useLLMService } from '../context/WorkflowContext'
import SearchResults from './SearchResults'

const SearchPage = () => {
  const llmService = useLLMService()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query')
      return
    }

    if (!llmService.isWorkerEnabled) {
      setError('Search requires cloud infrastructure. Please check your worker configuration.')
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      console.log('🔍 Starting global search:', { query: searchQuery })

      // Simple global search: embed query + search vectorize
      const results = await llmService.globalSemanticSearch(searchQuery, 50)

      console.log('✅ Search completed:', {
        totalResults: results.length,
        query: searchQuery
      })

      setSearchResults(results)

    } catch (err) {
      console.error('❌ Search failed:', err)
      setError(`Search failed: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">🔍</span>
              Semantic Search
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Search across all your research content using AI-powered semantic understanding
            </p>
          </div>

          {/* Search Form */}
          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Search Input */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Query
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter your search query (e.g., 'tariffs impact on inflation', 'summit analysis', 'economic data')"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                    disabled={isSearching}
                  />
                  
                  {/* Search suggestions for quick access */}
                  {!searchQuery && !isSearching && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-2">Quick search suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {['tariffs', 'economic impact', 'geopolitical analysis', 'summit', 'inflation', 'trade policy'].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setSearchQuery(suggestion)}
                            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>


              {/* Search Button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {llmService.isWorkerEnabled ? (
                    <span className="text-green-600">✅ Cloud search enabled</span>
                  ) : (
                    <span className="text-red-600">❌ Cloud search requires worker configuration</span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !llmService.isWorkerEnabled}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">❌</span>
              <div>
                <p className="text-red-800 font-medium">Search Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Tips */}
        {!searchResults && !isSearching && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Search Tips</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-medium mb-2">What you can search for:</h4>
                <ul className="space-y-1">
                  <li>• Research topics and concepts</li>
                  <li>• Specific data or statistics</li>
                  <li>• Author names or sources</li>
                  <li>• Geographic locations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Search techniques:</h4>
                <ul className="space-y-1">
                  <li>• Use natural language queries</li>
                  <li>• Try multiple related terms</li>
                  <li>• Search for synonyms</li>
                  <li>• Use specific vs. general terms</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Pro tip:</strong> The search uses AI-powered semantic understanding, so you can search using natural language rather than just keywords.
              </p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <SearchResults 
            results={searchResults}
            query={searchQuery}
            isLoading={isSearching}
          />
        )}

        {/* No Results */}
        {!isSearching && searchQuery && searchResults.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">
              Try adjusting your search query or changing the filters. Make sure you have content stored in your projects.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && searchResults.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
            <p className="text-gray-600 mb-4">
              Enter a search query above to find relevant content across your research projects.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-blue-600 text-xl mb-2">📄</div>
                <h4 className="font-medium text-blue-900">Research Cards</h4>
                <p className="text-blue-700">Search through individual research findings and insights</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-green-600 text-xl mb-2">📊</div>
                <h4 className="font-medium text-green-900">Reports</h4>
                <p className="text-green-700">Find comprehensive research reports and analyses</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-purple-600 text-xl mb-2">📋</div>
                <h4 className="font-medium text-purple-900">Project Plans</h4>
                <p className="text-purple-700">Locate research plans and project structures</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage