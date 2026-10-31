export const formatMessage = (text) => {
  // Remove extra whitespace
  let formatted = text.trim()
  
  // Replace multiple newlines with double
  formatted = formatted.replace(/\n{3,}/g, '\n\n')
  
  // Convert markdown bold to HTML if needed
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Convert markdown italic to HTML if needed
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  return formatted
}

export const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Date(date).toLocaleDateString('en-US', options)
}

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
