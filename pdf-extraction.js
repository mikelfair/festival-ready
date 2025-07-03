// Festival Ready v3.0 - Shared PDF Extraction Utility
// Used across all 12 tools for script/document upload

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Extract text content from a PDF file
 * @param {File} file - The PDF file to extract text from
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items with proper spacing
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      if (pageText) {
        fullText += pageText + '\n\n';
      }
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF document.');
  }
}

/**
 * Initialize PDF upload functionality for a form
 * @param {string} fileInputId - ID of the file input element
 * @param {string} textAreaId - ID of the textarea to populate with extracted text
 * @param {number} maxLength - Maximum character length (optional)
 */
function initializePDFUpload(fileInputId, textAreaId, maxLength = null) {
  const fileInput = document.getElementById(fileInputId);
  const textArea = document.getElementById(textAreaId);
  const dropZone = fileInput.closest('.file-upload-area') || fileInput.parentElement;
  
  if (!fileInput || !textArea) {
    console.error('PDF upload initialization failed: elements not found');
    return;
  }

  // File input change handler
  fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
  }

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.add('drag-over');
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.remove('drag-over');
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      fileInput.files = files; // Update the file input
      processFile(file);
    }
  }

  async function processFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
      showError('Please select a PDF file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB.');
      return;
    }

    // Show loading state
    const originalPlaceholder = textArea.placeholder;
    textArea.placeholder = 'Extracting text from PDF...';
    textArea.disabled = true;

    try {
      const extractedText = await extractTextFromPDF(file);
      
      if (!extractedText.trim()) {
        showError('No text could be extracted from this PDF. Please ensure it contains readable text.');
        return;
      }

      // Truncate if necessary
      let finalText = extractedText;
      if (maxLength && extractedText.length > maxLength) {
        finalText = extractedText.substring(0, maxLength);
        showInfo(`Text was truncated to ${maxLength} characters. Original length: ${extractedText.length} characters.`);
      }

      // Populate textarea
      textArea.value = finalText;
      textArea.placeholder = originalPlaceholder;
      
      // Trigger any character count updates
      textArea.dispatchEvent(new Event('input'));
      
      showSuccess(`Successfully extracted ${finalText.length} characters from PDF.`);
      
    } catch (error) {
      showError(error.message);
    } finally {
      textArea.disabled = false;
      textArea.placeholder = originalPlaceholder;
    }
  }

  function showError(message) {
    showMessage(message, 'error');
  }

  function showSuccess(message) {
    showMessage(message, 'success');
  }

  function showInfo(message) {
    showMessage(message, 'info');
  }

  function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.pdf-message');
    existingMessages.forEach(msg => msg.remove());

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `pdf-message pdf-message-${type}`;
    messageDiv.textContent = message;
    
    // Insert after file input
    fileInput.parentNode.insertBefore(messageDiv, fileInput.nextSibling);
    
    // Auto-remove after 5 seconds for success/info messages
    if (type !== 'error') {
      setTimeout(() => {
        messageDiv.remove();
      }, 5000);
    }
  }
}

/**
 * Character counter for textareas with PDF support
 * @param {string} textAreaId - ID of the textarea
 * @param {number} maxLength - Maximum character length
 * @param {string} counterId - ID of the counter display element
 */
function initializeCharacterCounter(textAreaId, maxLength, counterId) {
  const textArea = document.getElementById(textAreaId);
  const counter = document.getElementById(counterId);
  
  if (!textArea || !counter) {
    console.error('Character counter initialization failed: elements not found');
    return;
  }

  function updateCounter() {
    const currentLength = textArea.value.length;
    const remaining = maxLength - currentLength;
    
    counter.textContent = `${currentLength}/${maxLength}`;
    
    // Add warning classes
    counter.classList.remove('warning', 'error');
    if (remaining < 100) {
      counter.classList.add('warning');
    }
    if (remaining < 0) {
      counter.classList.add('error');
    }
  }

  // Update on input
  textArea.addEventListener('input', updateCounter);
  
  // Initial update
  updateCounter();
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractTextFromPDF,
    initializePDFUpload,
    initializeCharacterCounter
  };
}