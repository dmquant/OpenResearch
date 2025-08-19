import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { workerApiService } from '../services/WorkerApiService'

const WYSIWYGReportEditor = () => {
  const { projectId, reportId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get initial data from location state or props
  const initialReport = location.state?.report
  const initialProject = location.state?.project
  
  const [project, setProject] = useState(initialProject || null)
  const [report, setReport] = useState(initialReport || null)
  const [isLoading, setIsLoading] = useState(!initialReport)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [title, setTitle] = useState('')
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true)

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (isAutoSaveEnabled) {
        debouncedAutoSave(editor.getHTML())
      }
    },
  })

  // Auto-save functionality
  const autoSave = useCallback(async (content) => {
    if (!projectId || !reportId || !content) return
    
    try {
      setIsSaving(true)
      
      await workerApiService.updateReport(projectId, reportId, {
        content,
        title,
        updatedAt: new Date().toISOString()
      })
      
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [projectId, reportId, title])

  // Debounced auto-save to avoid too frequent saves
  const debouncedAutoSave = useCallback(
    debounce(autoSave, 2000),
    [autoSave]
  )

  // Load report data if not provided in initial state
  useEffect(() => {
    const loadReportData = async () => {
      if (initialReport && initialProject) return
      
      if (!projectId || !reportId) {
        console.error('Missing projectId or reportId')
        navigate('/knowledge')
        return
      }

      try {
        setIsLoading(true)
        
        if (!project) {
          const projectData = await workerApiService.getProject(projectId)
          setProject(projectData)
        }

        if (!report) {
          const reportData = await workerApiService.getReport(projectId, reportId)
          setReport(reportData)
          setTitle(reportData.title || '')
          
          if (editor && reportData.content) {
            editor.commands.setContent(reportData.content)
          }
        }
      } catch (error) {
        console.error('Failed to load report:', error)
        navigate('/knowledge')
      } finally {
        setIsLoading(false)
      }
    }

    loadReportData()
  }, [projectId, reportId, initialReport, initialProject, editor, navigate])

  // Set initial content when editor and report are ready
  useEffect(() => {
    if (editor && report?.content && !editor.getHTML().includes(report.content.substring(0, 50))) {
      editor.commands.setContent(report.content)
      setTitle(report.title || '')
    }
  }, [editor, report])

  // Manual save function
  const handleManualSave = async () => {
    if (!editor || !projectId || !reportId) return
    
    const content = editor.getHTML()
    await autoSave(content)
  }

  // Export functions
  const exportAsMarkdown = () => {
    if (!editor) return
    
    const content = editor.getText()
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'report'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsHTML = () => {
    if (!editor) return
    
    const content = editor.getHTML()
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'report'}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Toolbar button component
  const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-md border transition-colors ${
        isActive
          ? 'bg-blue-100 border-blue-300 text-blue-700'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}`}
    >
      {children}
    </button>
  )

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading report...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <span>←</span>
              <span>Back to Project</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Auto-save toggle */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={isAutoSaveEnabled}
                onChange={(e) => setIsAutoSaveEnabled(e.target.checked)}
                className="rounded"
              />
              <span>Auto-save</span>
            </label>

            {/* Save status */}
            <div className="text-sm text-gray-500">
              {isSaving ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                  <span>Saving...</span>
                </span>
              ) : lastSaved ? (
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              ) : null}
            </div>

            {/* Manual save button */}
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        {/* Report title */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report Title"
            className="w-full text-2xl font-bold border-none outline-none bg-transparent placeholder-gray-400"
          />
        </div>

        {/* Project context */}
        {project && (
          <div className="text-sm text-gray-600 mb-6">
            <span>Project: </span>
            <span className="font-medium">{project.title}</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
              >
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
              >
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
              >
                <s>S</s>
              </ToolbarButton>
            </div>

            {/* Headings */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
              >
                H1
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                H2
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                H3
              </ToolbarButton>
            </div>

            {/* Lists */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
              >
                •
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
              >
                1.
              </ToolbarButton>
            </div>

            {/* Blocks */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-3">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
              >
                💬
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Inline Code"
              >
                {'<>'}
              </ToolbarButton>
            </div>

            {/* Export */}
            <div className="flex items-center space-x-1">
              <button
                onClick={exportAsMarkdown}
                className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                title="Export as Markdown"
              >
                MD
              </button>
              <button
                onClick={exportAsHTML}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                title="Export as HTML"
              >
                HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="border border-gray-300 rounded-b-lg bg-white min-h-[600px]">
        <EditorContent 
          editor={editor}
          className="min-h-[600px]"
        />
      </div>

      {/* Footer info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Use the toolbar above to format your content. Changes are automatically saved when auto-save is enabled.
        <br />
        <strong>Available formatting:</strong> Bold, Italic, Strikethrough, Headings (H1-H3), Lists, Blockquotes, Code
      </div>
    </div>
  )
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export default WYSIWYGReportEditor