// PDF Extraction utility for Festival Ready v3.0
// Handles PDF file upload and text extraction for script uploads

function setupPDFUpload(uploadArea, fileInput, fileInfo) {
    // Set up file input change handler
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
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
    if (file && file.type === 'application/pdf') {
        extractTextFromPDF(file);
    } else {
        alert('Please upload a PDF file only.');
    }
}

function extractTextFromPDF(file, fileInfoElement) {
    // Simple PDF handling - just store file info
    // In a full implementation, you would use PDF.js to extract text
    
    if (fileInfoElement) {
        fileInfoElement.style.display = 'block';
        fileInfoElement.innerHTML = `
            <div style="color: #667eea; font-weight: 600;">
                📄 File uploaded: ${file.name}
            </div>
            <div style="color: #666; font-size: 0.85rem; margin-top: 5px;">
                Size: ${(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
        `;
    }
    
    // Store file name for form submission
    window.uploadedFileName = file.name;
    
    // In a real implementation, you would extract text here
    // For now, we'll just indicate the file was uploaded
    console.log('PDF file uploaded:', file.name);
}