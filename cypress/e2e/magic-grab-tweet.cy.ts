describe('Magic Grab Tweet Selection', () => {
  beforeEach(() => {
    // Visit the editor
    cy.visit('http://localhost:5173/');
    
    // Wait for the editor to load
    cy.get('.toolbar').should('be.visible');
  });

  it('should correctly grab the third paragraph of a tweet', () => {
    // Load the tweet screenshot
    const tweetImagePath = 'Screenshot 2025-07-23 at 3.03.57 PM.png';
    
    // Upload the image
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(''), // Placeholder - in real test, load actual file
      fileName: tweetImagePath,
      mimeType: 'image/png'
    }, { force: true });
    
    // Wait for image to load
    cy.get('canvas').should('be.visible');
    cy.wait(1000); // Give time for image to render
    
    // Select the magic grab tool
    cy.contains('button', 'Magic Grab').click();
    
    // Draw marquee around third paragraph (y ≈ 730)
    const selection = {
      startX: 130,
      startY: 730,
      endX: 670,
      endY: 790
    };
    
    // Perform the selection
    cy.get('.canvas-container')
      .trigger('mousedown', selection.startX, selection.startY)
      .trigger('mousemove', selection.endX, selection.endY)
      .trigger('mouseup');
    
    // Wait for segmentation to complete
    cy.wait(2000);
    
    // Verify a layer was created
    cy.get('[data-testid="magic-grab-layer"]').should('exist');
    
    // Get the initial position of the layer
    cy.get('[data-testid="magic-grab-layer"]').then($layer => {
      const initialTop = parseInt($layer.css('top'));
      const initialLeft = parseInt($layer.css('left'));
      
      // Drag the layer up by 50px
      cy.get('[data-testid="magic-grab-layer"]')
        .trigger('mousedown', { button: 0 })
        .trigger('mousemove', initialLeft, initialTop - 50)
        .trigger('mouseup');
      
      // Verify the layer moved
      cy.get('[data-testid="magic-grab-layer"]').should($movedLayer => {
        const newTop = parseInt($movedLayer.css('top'));
        expect(newTop).to.be.closeTo(initialTop - 50, 5);
      });
    });
    
    // Take a screenshot of the canvas for pixel analysis
    cy.get('canvas').then($canvas => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Get image data from the original paragraph location
        const originalAreaData = ctx.getImageData(
          selection.startX,
          selection.startY,
          selection.endX - selection.startX,
          selection.endY - selection.startY
        );
        
        // Count non-transparent pixels in original location
        let originalAlphaSum = 0;
        for (let i = 3; i < originalAreaData.data.length; i += 4) {
          originalAlphaSum += originalAreaData.data[i];
        }
        const originalAlphaPercentage = (originalAlphaSum / (originalAreaData.data.length / 4)) / 255 * 100;
        
        // Verify ≤ 5% residual alpha in original location
        expect(originalAlphaPercentage).to.be.lessThan(5);
        
        // Get image data from the new location (50px up)
        const newAreaData = ctx.getImageData(
          selection.startX,
          selection.startY - 50,
          selection.endX - selection.startX,
          selection.endY - selection.startY - 50
        );
        
        // Count non-transparent pixels in new location
        let newAlphaSum = 0;
        for (let i = 3; i < newAreaData.data.length; i += 4) {
          newAlphaSum += newAreaData.data[i];
        }
        const newAlphaPercentage = (newAlphaSum / (newAreaData.data.length / 4)) / 255 * 100;
        
        // Verify ≥ 95% alpha in new location
        expect(newAlphaPercentage).to.be.greaterThan(95);
      }
    });
    
    // Test selecting the first paragraph to ensure distinct layers
    const firstParagraphSelection = {
      startX: 130,
      startY: 200,
      endX: 670,
      endY: 260
    };
    
    // Select magic grab tool again
    cy.contains('button', 'Magic Grab').click();
    
    // Draw marquee around first paragraph
    cy.get('.canvas-container')
      .trigger('mousedown', firstParagraphSelection.startX, firstParagraphSelection.startY)
      .trigger('mousemove', firstParagraphSelection.endX, firstParagraphSelection.endY)
      .trigger('mouseup');
    
    // Wait for segmentation
    cy.wait(2000);
    
    // Verify two distinct layers exist
    cy.get('[data-testid="magic-grab-layer"]').should('have.length', 2);
    
    // Verify layers have different IDs
    cy.get('[data-testid="magic-grab-layer"]').then($layers => {
      const layer1Id = $layers.eq(0).attr('data-layer-id');
      const layer2Id = $layers.eq(1).attr('data-layer-id');
      expect(layer1Id).to.not.equal(layer2Id);
    });
  });

  it('should show debug overlay with Cmd+Shift+D', () => {
    // Upload an image first
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(''),
      fileName: 'test.png',
      mimeType: 'image/png'
    }, { force: true });
    
    // Press Cmd+Shift+D
    cy.get('body').type('{cmd+shift}D');
    
    // Verify debug overlay is visible
    cy.contains('Debug Mode Active').should('be.visible');
    
    // Press again to hide
    cy.get('body').type('{cmd+shift}D');
    
    // Verify debug overlay is hidden
    cy.contains('Debug Mode Active').should('not.exist');
  });
});