import React, { useRef } from 'react'

function FileUpload({ onUpload }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div className="file-upload">
      <button className="file-upload-button" onClick={() => fileInputRef.current?.click()}>
        <span className="file-upload-title">Choose File</span>
        <span className="file-upload-subtitle">Upload and index a new source</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.docx,.ppt,.pptx,.csv,.json,.html,.htm,.xml,.svg,.yml,.yaml,.log,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default FileUpload
