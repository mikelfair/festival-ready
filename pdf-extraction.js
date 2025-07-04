// PDF Text Extraction utility
function setupPDFUpload(uploadArea, fileInput, fileInfo) {
    // PDF upload is optional, so we'll just show file info without extraction
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            showFileInfo(file, fileInfo);
        }
    });
}

function extractTextFromPDF(file, fileInfoElement) {
    // Simple file info display - actual PDF extraction would require additional libraries
    showFileInfo(file, fileInfoElement);
}

function showFileInfo(file, fileInfoElement) {
    if (fileInfoElement) {
        fileInfoElement.style.display = 'block';
        fileInfoElement.innerHTML = `
            <strong>File uploaded:</strong> ${file.name}<br>
            <strong>Size:</strong> ${(file.size / 1024).toFixed(1)} KB<br>
            <small>Note: PDF content will be processed on the server.</small>
        `;
    }
}