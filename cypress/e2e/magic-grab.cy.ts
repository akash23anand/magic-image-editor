/**
 * E2E Test for Magic Grab V2
 * Tests the selection and dragging of text paragraphs
 */

describe('Magic Grab Feature', () => {
  beforeEach(() => {
    // Visit the editor page
    cy.visit('/');
    
    // Wait for the editor to load
    cy.get('.editor-container').should('be.visible');
  });

  it('should correctly grab and move the bottom paragraph of a tweet', () => {
    // Load the tweet screenshot
    const tweetImagePath = 'fixtures/tweet-screenshot.png';
    
    // Upload the image
    cy.get('input[type="file"]').selectFile(tweetImagePath, { force: true });
    
    // Wait for image to load
    cy.get('canvas').should('be.visible');
    cy.wait(1000); // Give time for image to render
    
    // Select the Magic Grab tool
    cy.get('[data-tool="magic-grab"]').click();
    
    // Get canvas dimensions and calculate bottom paragraph position
    cy.get('canvas').then(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      
      // Assuming the bottom paragraph is in the lower third of the image
      // These coordinates should be adjusted based on the actual tweet layout
      const startX = rect.left + rect.width * 0.1;
      const startY = rect.top + rect.height * 0.7;
      const endX = rect.left + rect.width * 0.9;
      const endY = rect.top + rect.height * 0.85;
      
      // Draw selection marquee around bottom paragraph
      cy.get('.canvas-container')
        .trigger('mousedown', startX, startY, { which: 1 })
        .trigger('mousemove', endX, endY)
        .trigger('mouseup');
    });
    
    // Wait for segmentation to complete
    cy.wait(2000);
    
    // Verify a new layer was created
    cy.get('[data-testid="grabbed-layer"]').should('exist');
    
    // Get the initial position of the grabbed object
    cy.get('[data-testid="grabbed-layer"]').then(($layer) => {
      const initialPosition = {
        x: parseInt($layer.css('left')),
        y: parseInt($layer.css('top'))
      };
      
      // Test alpha coverage inside the paragraph bounds
      cy.window().then((win) => {
        const layerCanvas = $layer.find('canvas')[0] as HTMLCanvasElement;
        const ctx = layerCanvas.getContext('2d');
        const imageData = ctx?.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
        
        if (imageData) {
          let alphaPixels = 0;
          let totalPixels = 0;
          
          // Count non-transparent pixels
          for (let i = 3; i < imageData.data.length; i += 4) {
            totalPixels++;
            if (imageData.data[i] > 0) {
              alphaPixels++;
            }
          }
          
          const alphaCoverage = (alphaPixels / totalPixels) * 100;
          expect(alphaCoverage).to.be.greaterThan(95);
        }
      });
      
      // Drag the layer 100px down
      const dragDistance = 100;
      cy.get('[data-testid="grabbed-layer"]')
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: initialPosition.x, clientY: initialPosition.y + dragDistance })
        .trigger('mouseup');
      
      // Verify the layer moved
      cy.get('[data-testid="grabbed-layer"]').should(($movedLayer) => {
        const newY = parseInt($movedLayer.css('top'));
        expect(newY).to.be.closeTo(initialPosition.y + dragDistance, 5);
      });
      
      // Take screenshots for pixel diff comparison
      cy.screenshot('after-drag');
      
      // Verify the original paragraph area is now empty
      cy.window().then((win) => {
        // This would require access to the original canvas to verify
        // the paragraph has been removed from its original position
        // In a real implementation, we'd compare pixel data
      });
    });
  });
  
  it('should handle text selection for small height selections', () => {
    // Upload an image with text
    cy.get('input[type="file"]').selectFile('fixtures/text-document.png', { force: true });
    cy.wait(1000);
    
    // Select Magic Grab tool
    cy.get('[data-tool="magic-grab"]').click();
    
    // Make a selection with height < 64px (text detection threshold)
    cy.get('canvas').then(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      
      // Select a thin horizontal strip (likely text)
      const startX = rect.left + 50;
      const startY = rect.top + 200;
      const endX = rect.left + rect.width - 50;
      const endY = rect.top + 240; // 40px height
      
      cy.get('.canvas-container')
        .trigger('mousedown', startX, startY, { which: 1 })
        .trigger('mousemove', endX, endY)
        .trigger('mouseup');
    });
    
    // Wait for OCR and segmentation
    cy.wait(3000);
    
    // Verify text layer was created
    cy.get('[data-testid="grabbed-layer"]').should('contain', 'Text Layer');
  });
  
  it('should support keyboard shortcuts', () => {
    // Setup: Upload image and create a grabbed layer
    cy.get('input[type="file"]').selectFile('fixtures/test-image.png', { force: true });
    cy.wait(1000);
    cy.get('[data-tool="magic-grab"]').click();
    
    // Make a selection
    cy.get('.canvas-container')
      .trigger('mousedown', 100, 100, { which: 1 })
      .trigger('mousemove', 300, 300)
      .trigger('mouseup');
    
    cy.wait(2000);
    
    // Test arrow key nudging
    cy.get('[data-testid="grabbed-layer"]').then(($layer) => {
      const initialX = parseInt($layer.css('left'));
      const initialY = parseInt($layer.css('top'));
      
      // Press right arrow
      cy.get('body').type('{rightarrow}');
      cy.get('[data-testid="grabbed-layer"]').should(($movedLayer) => {
        expect(parseInt($movedLayer.css('left'))).to.equal(initialX + 1);
      });
      
      // Press shift + down arrow (10px nudge)
      cy.get('body').type('{shift}{downarrow}');
      cy.get('[data-testid="grabbed-layer"]').should(($movedLayer) => {
        expect(parseInt($movedLayer.css('top'))).to.equal(initialY + 10);
      });
      
      // Test duplicate (Ctrl/Cmd + J)
      const isMac = Cypress.platform === 'darwin';
      cy.get('body').type(isMac ? '{cmd}j' : '{ctrl}j');
      cy.get('[data-testid="grabbed-layer"]').should('have.length', 2);
      
      // Test delete
      cy.get('[data-testid="grabbed-layer"]').first().click();
      cy.get('body').type('{del}');
      cy.get('[data-testid="grabbed-layer"]').should('have.length', 1);
    });
  });
});