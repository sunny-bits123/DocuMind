function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader-container">
      <div className="loader-spinner" />
      <span>{label}</span>
    </div>
  )
}

export default Loader
