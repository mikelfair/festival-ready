// PDF.js library - load from CDN
if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js';
    script.onload = function() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';
    };
    document.head.appendChild(script);
}

// Global variable to store extracted text
window.extractedPDFText = null;

// Setup PDF upload functionality
function setupPDFUpload(uploadArea, fileInput, fileInfo) {
    // This function is called from the HTML pages to set up the upload area
    if (!uploadArea || !fileInput || !fileInfo) {
        console.warn('PDF upload elements not found');
        return;
    }
    
    // File input change handler is set up in the HTML
    console.log('PDF upload functionality initialized');
}

// Extract text from PDF file
async function extractTextFromPDF(file, fileInfoElement) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please select a valid PDF file.');
        return;
    }
    
    try {
        // Show file info
        if (fileInfoElement) {
            fileInfoElement.style.display = 'block';
            fileInfoElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border: 2px solid #667eea; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Extracting text from ${file.name}...</span>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
        
        // Wait for PDF.js to load if needed
        let attempts = 0;
        while (!window.pdfjsLib && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.pdfjsLib) {
            throw new Error('PDF.js library failed to load');
        }
        
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        // Clean up the text
        fullText = fullText.trim().replace(/\s+/g, ' ');
        
        if (fullText.length === 0) {
            throw new Error('No text found in PDF');
        }
        
        // Store extracted text globally
        window.extractedPDFText = fullText;
        
        // Show success info
        if (fileInfoElement) {
            const wordCount = fullText.split(/\s+/).length;
            const charCount = fullText.length;
            
            fileInfoElement.innerHTML = `
                <div style="color: #28a745;">
                    <strong>✓ PDF processed successfully</strong><br>
                    <small>${file.name} - ${wordCount} words, ${charCount} characters</small>
                </div>
            `;
        }
        
        console.log('PDF text extracted successfully:', fullText.substring(0, 200) + '...');
        
    } catch (error) {
        console.error('PDF extraction error:', error);
        
        if (fileInfoElement) {
            fileInfoElement.innerHTML = `
                <div style="color: #e74c3c;">
                    <strong>⚠ Error processing PDF</strong><br>
                    <small>${error.message}</small>
                </div>
            `;
        }
        
        // Clear any stored text
        window.extractedPDFText = null;
    }
}