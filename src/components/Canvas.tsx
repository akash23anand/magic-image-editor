import React, { useEffect, useRef } from 'react'

interface CanvasProps {
  imageUrl: string | null
}

const Canvas: React.FC<CanvasProps> = ({ imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    console.log('Canvas initialization useEffect running')
    
    if (canvasRef.current && !ctxRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctxRef.current = ctx
        console.log('2D context initialized successfully')
        
        // Draw a background to make canvas visible
        ctx.fillStyle = '#e0e0e0'
        ctx.fillRect(0, 0, 800, 600)
        console.log('Canvas background drawn')
      } else {
        console.error('Failed to get 2D context')
      }
    }
  }, [])

  useEffect(() => {
    console.log('Canvas image rendering useEffect triggered with imageUrl:', imageUrl)
    
    if (!ctxRef.current) {
      console.log('2D context not available')
      return
    }
    
    const ctx = ctxRef.current
    
    // Clear canvas
    ctx.clearRect(0, 0, 800, 600)
    ctx.fillStyle = '#e0e0e0'
    ctx.fillRect(0, 0, 800, 600)
    
    if (!imageUrl) {
      console.log('No image URL provided')
      return
    }
    
    console.log('Starting to load image:', imageUrl)
    
    const img = new Image()
    
    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height)
      
      // Calculate scaling to fit canvas
      const canvasWidth = 800
      const canvasHeight = 600
      
      const scaleX = canvasWidth / img.width
      const scaleY = canvasHeight / img.height
      const scale = Math.min(scaleX, scaleY)
      
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale
      
      const x = (canvasWidth - drawWidth) / 2
      const y = (canvasHeight - drawHeight) / 2
      
      console.log('Drawing image at:', x, y, 'size:', drawWidth, drawHeight)
      
      ctx.drawImage(img, x, y, drawWidth, drawHeight)
    }
    
    img.onerror = (error) => {
      console.error('Failed to load image:', imageUrl, error)
      
      // Draw error message
      ctx.fillStyle = 'red'
      ctx.font = '20px Arial'
      ctx.fillText('Failed to load image', 50, 300)
    }
    
    // Handle both data URLs and regular URLs
    if (imageUrl.startsWith('data:')) {
      img.src = imageUrl
    } else {
      img.crossOrigin = 'anonymous'
      img.src = imageUrl
    }
  }, [imageUrl])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{
        border: '2px solid #007bff',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block',
        backgroundColor: '#ffffff'
      }}
    />
  )
}

export default Canvas