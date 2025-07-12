// PDF Extraction utility for Festival Ready v3.0 - Updated 2025-01-08
// Handles PDF file upload and text extraction for script uploads
console.log('PDF extraction utility loaded - v3.0.2');

function setupPDFUpload(uploadArea, fileInput, fileInfo) {
    console.log('Setting up PDF upload with elements:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput, 
        fileInfo: !!fileInfo
    });
    
    // Set up file input change handler
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            console.log('File input changed, files:', e.target.files.length);
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
    
    // Set up drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileUpload(files[0]);
            }
        });
    }
}

function handleFileUpload(file) {
    console.log('Handling file upload:', {
        file: file?.name,
        type: file?.type,
        size: file?.size
    });
    
    if (file && file.type === 'application/pdf') {
        const fileInfo = document.getElementById('fileInfo');
        extractTextFromPDF(file, fileInfo);
    } else {
        console.error('Invalid file type:', file?.type);
        alert('Please upload a PDF file only.');
    }
}

async function extractTextFromPDF(file, fileInfoElement) {
    console.log('PDF extraction started for:', file.name);
    try {
        // Show upload confirmation
        if (fileInfoElement) {
            fileInfoElement.style.display = 'block';
            fileInfoElement.innerHTML = `
                <div style="color: #667eea; font-weight: 600;">
                    📄 Extracting text from: ${file.name}
                </div>
                <div style="color: #666; font-size: 0.85rem; margin-top: 5px;">
                    Size: ${(file.size / 1024 / 1024).toFixed(2)} MB - Please wait...
                </div>
            `;
        }
        
        // Load PDF.js library if not already loaded
        if (typeof pdfjsLib === 'undefined') {
            console.log('Loading PDF.js library...');
            await loadPDFJS();
            console.log('PDF.js library loaded successfully');
        } else {
            console.log('PDF.js library already loaded');
        }
        
        // Convert file to array buffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Load PDF document
        console.log('Loading PDF document...');
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log('PDF loaded, pages:', pdf.numPages);
        let extractedText = '';
        
        // Extract text from all pages
        for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 100); pageNum++) { // Limit to 100 pages
            console.log(`Extracting text from page ${pageNum}...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            extractedText += pageText + ' ';
        }
        console.log('Text extraction complete, total length:', extractedText.length);
        
        // Clean up the extracted text
        extractedText = cleanExtractedText(extractedText);
        
        // Ensure text ends with a period
        if (extractedText && !extractedText.trim().endsWith('.')) {
            extractedText = extractedText.trim() + '.';
        }
        
        // Store extracted text globally
        window.extractedPDFText = extractedText;
        
        // Populate the script_text field
        const scriptTextarea = document.getElementById('script_text');
        if (scriptTextarea && extractedText) {
            scriptTextarea.value = extractedText;
            // Trigger character count update
            const event = new Event('input', { bubbles: true });
            scriptTextarea.dispatchEvent(event);
        }
        
        // Update file info display
        if (fileInfoElement) {
            fileInfoElement.innerHTML = `
                <div style="color: #28a745; font-weight: 600;">
                    ✅ Text extracted from: ${file.name}
                </div>
                <div style="color: #666; font-size: 0.85rem; margin-top: 5px;">
                    ${extractedText.length} characters extracted and added to Script Text field
                </div>
            `;
        }
        
        console.log('PDF text extraction completed:', extractedText.length, 'characters');
        
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        
        // Show error in file info
        if (fileInfoElement) {
            fileInfoElement.innerHTML = `
                <div style="color: #e74c3c; font-weight: 600;">
                    ❌ Error extracting text from: ${file.name}
                </div>
                <div style="color: #666; font-size: 0.85rem; margin-top: 5px;">
                    PDF upload failed. You can still type in the Script Text field manually.
                </div>
            `;
        }
        
        // Store file name for form submission
        window.uploadedFileName = file.name;
    }
}

function cleanExtractedText(text) {
    // Remove excessive whitespace and clean up common PDF artifacts
    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .replace(/[^\w\s.,!?;:()"'-]/g, '') // Remove non-standard characters
        .trim();
}

async function loadPDFJS() {
    return new Promise((resolve, reject) => {
        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            // Set worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}