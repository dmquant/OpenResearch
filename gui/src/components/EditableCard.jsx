import { useState, useRef, useEffect } from 'react'

const EditableCard = ({ children, isEditing, onSave, className = '' }) => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const cardRef = useRef(null)

  // Extract text content from children for editing
  const extractEditableContent = (element) => {
    const content = {}
    
    // Find title (h2, h3 elements)
    const titleElement = cardRef.current?.querySelector('h2, h3')
    if (titleElement) {
      content.title = titleElement.textContent
    }
    
    // Find description (p elements)
    const descElements = cardRef.current?.querySelectorAll('p')
    if (descElements.length > 0) {
      // Get the main description (usually the longest paragraph)
      const descriptions = Array.from(descElements).map(p => p.textContent)
      content.description = descriptions.find(desc => desc.length > 50) || descriptions[0]
    }
    
    return content
  }

  const handleDoubleClick = () => {
    if (!isEditing) return
    
    const content = extractEditableContent()
    setEditData(content)
    setIsEditMode(true)
  }

  const handleSave = () => {
    if (onSave) {
      onSave(editData)
    }
    setIsEditMode(false)
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setEditData({})
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
    }
  }

  if (isEditMode) {
    return (
      <div className={`${className} relative`}>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title:</label>
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          
          {editData.description && (
            <div>
              <label className="block text-sm font-medium mb-2">Description:</label>
              <textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        
        {/* Edit mode indicator */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✏️</span>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={cardRef}
      className={`${className} relative group ${isEditing ? 'cursor-pointer' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={isEditing ? 'Double-click to edit' : ''}
    >
      {children}
      
      {/* Edit indicator when hovering */}
      {isEditing && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-600 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex">
          <span className="text-white text-xs">✏️</span>
        </div>
      )}
    </div>
  )
}

export default EditableCard