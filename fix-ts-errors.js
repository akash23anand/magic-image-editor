// Quick script to fix TypeScript compilation issues
const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/App.tsx',
  'src/pages/Editor.tsx',
  'src/services/AIService.ts',
  'src/services/SAMService.ts',
  'src/services/TesseractService.ts',
  'src/services/U2NetService.ts',
  'src/services/UnifiedAIService.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix unused imports by adding _ prefix to unused variables
    if (filePath === 'src/pages/Editor.tsx') {
      content = content.replace(
        'import React, { useState, useRef, useEffect } from \'react\'',
        'import React, { useState, useEffect } from \'react\''
      );
    }
    
    if (filePath === 'src/services/TesseractService.ts') {
      // Use the e2eLogger
      content = content.replace(
        '        const { bbox, lines } = block;',
        '        const { bbox: _, lines } = block;'
      );
      content = content.replace(
        '          const { bbox: lineBbox, words } = line;',
        '          const { bbox: lineBbox, words } = line;'
      );
    }
    
    if (filePath === 'src/services/U2NetService.ts') {
      // Use the e2eLogger in key methods
      content = content.replace(
        '    const { width, height, data } = imageData;',
        '    const { width, height } = imageData;'
      );
    }
    
    if (filePath === 'src/services/SAMService.ts') {
      content = content.replace(
        '    const { width, height, data } = imageData;',
        '    const { width, height } = imageData;'
      );
    }
    
    if (filePath === 'src/services/UnifiedAIService.ts') {
      // Use the services object
      content = content.replace(
        '  private services = {',
        '  private _services = {'
      );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
  }
});

console.log('TypeScript fixes applied');