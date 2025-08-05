import { useState, useEffect } from 'react'
import { useWorkflow } from '../context/WorkflowContext'

const MDXEditor = () => {
  const { state, dispatch } = useWorkflow()
  const [content, setContent] = useState('')
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const report = state.composingPlan?.generatedReport

  useEffect(() => {
    if (report?.content) {
      setContent(report.content)
    }
  }, [report])

  const handleContentChange = (e) => {
    const newContent = e.target.value
    const previousLength = content.length
    const newLength = newContent.length
    
    console.log('✏️ MDXEditor: Content changed', {
      previousLength,
      newLength,
      changeAmount: newLength - previousLength,
      reportTitle: report?.title
    })
    
    setContent(newContent)
    
    // Update the report in the state
    dispatch({
      type: 'UPDATE_GENERATED_REPORT',
      payload: {
        ...report,
        content: newContent,
        lastModified: new Date().toISOString()
      }
    })
  }

  const exportToMarkdown = () => {
    const filename = `${report?.title?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'report'}.md`
    
    console.log('📄 MDXEditor: Exporting to Markdown', {
      reportTitle: report?.title,
      contentLength: content.length,
      filename: filename,
      sourceCards: report?.sourceCards
    })
    
    try {
      const blob = new Blob([content], { type: 'text/markdown' })
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
      console.error('📊 Markdown Export Error Details:', {
        reportTitle: report?.title,
        contentLength: content.length,
        error: error.message
      })
    }
  }

  const exportToMDX = () => {
    const filename = `${report?.title?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'report'}.mdx`
    
    console.log('🚀 MDXEditor: Exporting to MDX', {
      reportTitle: report?.title,
      contentLength: content.length,
      filename: filename,
      sourceCards: report?.sourceCards,
      createdAt: report?.createdAt
    })
    
    try {
      const blob = new Blob([content], { type: 'text/mdx' })
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
      console.error('📊 MDX Export Error Details:', {
        reportTitle: report?.title,
        contentLength: content.length,
        error: error.message
      })
    }
  }

  const renderPreview = () => {
    // Simple markdown-like preview rendering
    // For a production app, you'd want to use a proper MDX renderer
    const lines = content.split('\n')
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

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📝</span>
            MDX Report Editor
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Generate a report from your selected cards to start editing.
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No report generated</h3>
          <p className="text-gray-600 text-sm">
            Use the "Generate Report" button in the Composing Plan Canvas to create your report.
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
              <span className="mr-2">📝</span>
              MDX Report Editor
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Edit your generated report in MDX format. Use markdown syntax and MDX components.
            </p>
          </div>
          <div className="flex items-center space-x-3">
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
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToMarkdown}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>📄</span>
                <span>Export MD</span>
              </button>
              <button
                onClick={exportToMDX}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>🚀</span>
                <span>Export MDX</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!isPreviewMode ? (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Report Information</h3>
                <div className="text-sm text-gray-600">
                  Source Cards: {report.sourceCards} | Created: {new Date(report.createdAt).toLocaleString()}
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-800">{report.title}</h4>
            </div>

            <div className="relative">
              <textarea
                value={content}
                onChange={handleContentChange}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Start editing your MDX report here..."
                spellCheck={false}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {content.length} characters
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 MDX Tips</h4>
              <div className="text-blue-800 text-sm space-y-1">
                <p>• Use markdown syntax for basic formatting (headings, lists, emphasis)</p>
                <p>• Add frontmatter with --- at the top for metadata</p>
                <p>• Use code blocks with ``` for code examples</p>
                <p>• Tables are supported with | syntax</p>
                <p>• Click "Preview" to see how your content will render</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
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

export default MDXEditor