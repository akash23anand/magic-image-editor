import React from 'react'

interface ProgressBarProps {
  message: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({ message }) => {
  return (
    <div className="progress-bar">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  )
}

export default ProgressBar