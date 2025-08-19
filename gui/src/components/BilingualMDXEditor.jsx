import { useState, useEffect } from 'react'
import { useWorkflow } from '../context/WorkflowContext'
import AssetsDownloadService from '../services/AssetsDownloadService'

const BilingualMDXEditor = () => {
  const { state, dispatch } = useWorkflow()
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [currentContent, setCurrentContent] = useState('')
  const [isDownloadingAssets, setIsDownloadingAssets] = useState(false)

  // Get current language and reports from bilingual state
  const currentLanguage = state.bilingual.currentLanguage
  const reports = state.bilingual.reports
  const isTranslating = state.bilingual.isTranslating
  
  // Legacy support - if no bilingual reports but have legacy generated report
  const legacyReport = state.composingPlan?.generatedReport

  // Initialize bilingual reports from legacy report if needed
  useEffect(() => {
    if (legacyReport && !reports.english && !reports.chinese) {
      console.log('🔄 Converting legacy report to bilingual format')
      
      // Assume legacy report is in English
      const englishReport = {
        content: legacyReport.content,
        title: legacyReport.title,
        createdAt: legacyReport.createdAt,
        sourceCards: legacyReport.sourceCards,
        language: 'english'
      }
      
      dispatch({
        type: 'SET_BILINGUAL_REPORT',
        payload: {
          language: 'english',
          report: englishReport
        }
      })
    }
  }, [legacyReport, reports.english, reports.chinese, dispatch])

  // Update current content when language or reports change
  useEffect(() => {
    const currentReport = reports[currentLanguage]
    if (currentReport?.content) {
      setCurrentContent(currentReport.content)
    }
  }, [currentLanguage, reports])

  const handleContentChange = (e) => {
    const newContent = e.target.value
    const previousLength = currentContent.length
    const newLength = newContent.length
    
    console.log('✏️ BilingualMDXEditor: Content changed', {
      language: currentLanguage,
      previousLength,
      newLength,
      changeAmount: newLength - previousLength
    })
    
    setCurrentContent(newContent)
    
    // Update the bilingual report for current language
    const currentReport = reports[currentLanguage]
    if (currentReport) {
      dispatch({
        type: 'UPDATE_BILINGUAL_REPORT',
        payload: {
          language: currentLanguage,
          report: {
            ...currentReport,
            content: newContent,
            lastModified: new Date().toISOString()
          }
        }
      })
    }
  }

  const switchLanguage = (language) => {
    console.log('🌍 Switching language to:', language)
    dispatch({
      type: 'SET_BILINGUAL_LANGUAGE',
      payload: language
    })
  }

  const translateContent = async (fromLang, toLang) => {
    console.log(`🔄 Starting translation from ${fromLang} to ${toLang}`)
    
    const sourceReport = reports[fromLang]
    if (!sourceReport?.content) {
      alert(`No ${fromLang} content to translate`)
      return
    }

    dispatch({ type: 'SET_TRANSLATING', payload: true })

    try {
      const LLMService = (await import('../services/LLMAbstractionLayer.js')).default
      
      const translatedContent = await LLMService.translateContent(
        sourceReport.content,
        fromLang,
        toLang
      )

      const translatedReport = {
        content: translatedContent,
        title: toLang === 'chinese' ? `研究报告：${state.topic}` : `Research Report: ${state.topic}`,
        createdAt: sourceReport.createdAt,
        sourceCards: sourceReport.sourceCards,
        language: toLang,
        translatedFrom: fromLang,
        translatedAt: new Date().toISOString()
      }

      dispatch({
        type: 'SET_BILINGUAL_REPORT',
        payload: {
          language: toLang,
          report: translatedReport
        }
      })

      console.log('✅ Translation completed successfully')
      
    } catch (error) {
      console.error('❌ Translation failed:', error)
      alert(`Translation failed: ${error.message}`)
    } finally {
      dispatch({ type: 'SET_TRANSLATING', payload: false })
    }
  }

  const exportToMarkdown = (language) => {
    const report = reports[language]
    if (!report?.content) {
      alert(`No ${language} content to export`)
      return
    }

    const filename = `${report.title?.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').toLowerCase() || 'report'}_${language}.md`
    
    console.log('📄 BilingualMDXEditor: Exporting to Markdown', {
      language,
      filename,
      contentLength: report.content.length
    })
    
    try {
      const blob = new Blob([report.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('✅ Markdown export completed successfully')
    } catch (error) {
      console.error('❌ Error exporting to markdown:', error)
    }
  }

  const exportToMDX = (language) => {
    const report = reports[language]
    if (!report?.content) {
      alert(`No ${language} content to export`)
      return
    }

    const filename = `${report.title?.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').toLowerCase() || 'report'}_${language}.mdx`
    
    console.log('🚀 BilingualMDXEditor: Exporting to MDX', {
      language,
      filename,
      contentLength: report.content.length
    })
    
    try {
      const blob = new Blob([report.content], { type: 'text/mdx' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('✅ MDX export completed successfully')
    } catch (error) {
      console.error('❌ Error exporting to MDX:', error)
    }
  }

  const downloadAllAssets = async () => {
    console.log('📦 Starting assets download')
    setIsDownloadingAssets(true)

    try {
      const result = await AssetsDownloadService.downloadAllAssets(state)
      console.log('✅ Assets download completed:', result)
      
      // Show success message
      setTimeout(() => {
        alert(`Assets downloaded successfully!\nFile: ${result.filename}`)
      }, 100)
      
    } catch (error) {
      console.error('❌ Assets download failed:', error)
      alert(`Failed to download assets: ${error.message}`)
    } finally {
      setIsDownloadingAssets(false)
    }
  }

  const renderPreview = () => {
    // Simple markdown-like preview rendering
    const lines = currentContent.split('\n')
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold mt-6 mb-4">{line.slice(2)}</h1>
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold mt-5 mb-3">{line.slice(3)}</h2>
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-medium mt-4 mb-2">{line.slice(4)}</h3>
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-bold mb-2">{line.slice(2, -2)}</p>
      } else if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 mb-1">{line.slice(2)}</li>
      } else if (line.trim() === '') {
        return <br key={index} />
      } else if (line.startsWith('```')) {
        return <div key={index} className="bg-gray-100 p-2 rounded font-mono text-sm my-2">{line}</div>
      } else {
        return <p key={index} className="mb-2 leading-relaxed">{line}</p>
      }
    })
  }

  const currentReport = reports[currentLanguage]
  const hasAnyReport = reports.english || reports.chinese || legacyReport

  if (!hasAnyReport) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">🌍</span>
            Bilingual MDX Report Editor
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Generate a report from your selected cards to start editing in both English and Chinese.
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No report generated</h3>
          <p className="text-gray-600 text-sm">
            Use the "Generate Report" button in the Composing Plan Canvas to create your bilingual report.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="mr-2">🌍</span>
              Bilingual MDX Report Editor
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Edit your report in both English and Simplified Chinese. Switch between languages and sync translations.
            </p>
          </div>
          
          {/* Language Tabs */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => switchLanguage('english')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentLanguage === 'english' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                English {reports.english && '✓'}
              </button>
              <button
                onClick={() => switchLanguage('chinese')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentLanguage === 'chinese' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                中文 {reports.chinese && '✓'}
              </button>
            </div>
            
            {/* Edit/Preview Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setIsPreviewMode(false)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  !isPreviewMode ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setIsPreviewMode(true)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isPreviewMode ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportToMarkdown(currentLanguage)}
                disabled={!currentReport?.content}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>📄</span>
                <span>Export MD</span>
              </button>
              <button
                onClick={() => exportToMDX(currentLanguage)}
                disabled={!currentReport?.content}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>🚀</span>
                <span>Export MDX</span>
              </button>
              <button
                onClick={downloadAllAssets}
                disabled={isDownloadingAssets || (!reports.english && !reports.chinese)}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>📦</span>
                <span>{isDownloadingAssets ? 'Creating...' : 'Download All Assets'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!isPreviewMode ? (
          <div className="space-y-4">
            {/* Report Information */}
            {currentReport && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    Report Information ({currentLanguage === 'english' ? 'English' : '中文'})
                  </h3>
                  <div className="text-sm text-gray-600">
                    Source Cards: {currentReport.sourceCards} | Created: {new Date(currentReport.createdAt).toLocaleString()}
                    {currentReport.translatedFrom && (
                      <span className="ml-2 text-blue-600">
                        (Translated from {currentReport.translatedFrom})
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-800">{currentReport.title}</h4>
              </div>
            )}

            {/* Editor */}
            <div className="relative">
              <textarea
                value={currentContent}
                onChange={handleContentChange}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Start editing your ${currentLanguage === 'english' ? 'English' : 'Chinese'} MDX report here...`}
                spellCheck={false}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {currentContent.length} characters
              </div>
            </div>

            {/* Translation Sync Buttons */}
            <div className="flex items-center justify-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
              <button
                onClick={() => translateContent('chinese', 'english')}
                disabled={isTranslating || !reports.chinese?.content}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>🇨🇳→🇺🇸</span>
                <span>{isTranslating ? 'Translating...' : 'Chinese to English Sync'}</span>
              </button>
              
              <div className="text-gray-400 text-xl">⇄</div>
              
              <button
                onClick={() => translateContent('english', 'chinese')}
                disabled={isTranslating || !reports.english?.content}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>🇺🇸→🇨🇳</span>
                <span>{isTranslating ? 'Translating...' : 'English to Chinese Sync'}</span>
              </button>
            </div>

            {/* Translation Status */}
            {isTranslating && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                  <span className="text-yellow-800 font-medium">Translation in progress...</span>
                </div>
                <p className="text-yellow-700 text-sm mt-2">
                  The content is being translated block by block. This may take a few moments for longer reports.
                </p>
              </div>
            )}

            {/* Assets Download Status */}
            {isDownloadingAssets && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                  <span className="text-green-800 font-medium">Creating assets package...</span>
                </div>
                <p className="text-green-700 text-sm mt-2">
                  Collecting all project assets including bilingual reports, research cards, and metadata. This will download as a ZIP file.
                </p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Bilingual Editing Tips</h4>
              <div className="text-blue-800 text-sm space-y-1">
                <p>• Switch between English and Chinese using the language tabs</p>
                <p>• Use sync buttons to translate content between languages</p>
                <p>• Each language version is cached independently</p>
                <p>• Translations preserve MDX formatting and structure</p>
                <p>• Export each language version separately with the Export buttons</p>
                <p>• Use "Download All Assets" to get a complete project package with all reports, cards, and metadata</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">
                Preview ({currentLanguage === 'english' ? 'English' : '中文'})
              </h3>
              <div className="bg-white p-6 rounded border">
                {renderPreview()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BilingualMDXEditor