// Book banner utility for promotional content
function createBookBanner(containerId, toolType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Simple banner - can be enhanced later
    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 10px; text-align: center; font-size: 0.9rem; margin-bottom: 20px; border-radius: 8px;">
            📚 <strong>Festival Ready Guide:</strong> Get our comprehensive film festival submission guide for just $9.99! 
            <a href="#" style="color: white; text-decoration: underline; font-weight: bold;">Learn More</a>
        </div>
    `;
}