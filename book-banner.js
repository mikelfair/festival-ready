// Book Banner Component for Festival Ready v3.0
// Creates a standardized book banner for all tool pages

function createBookBanner(containerId, toolType) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Book banner container not found:', containerId);
        return;
    }
    
    // Create banner HTML
    const bannerHTML = `
        <div class="book-banner-container">
            <a href="https://amzn.to/4naJ4FT" target="_blank" class="book-banner" onclick="trackBookBannerClick('${toolType}')">
                <img src="images/festival-books-banner.png" alt="Film Festival Submitter's Handbook & Screenplay Judging Guide - Available on Amazon">
            </a>
        </div>
    `;
    
    container.innerHTML = bannerHTML;
    
    // Add CSS styles if not already present
    if (!document.getElementById('book-banner-styles')) {
        const styles = document.createElement('style');
        styles.id = 'book-banner-styles';
        styles.textContent = `
            .book-banner-container {
                width: 100%;
                max-width: 800px;
                background: rgba(255, 255, 255, 0.05);
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                margin: 30px auto 0;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            }
            
            .book-banner {
                display: block;
                transition: transform 0.3s ease;
                text-decoration: none;
            }
            
            .book-banner:hover {
                transform: scale(1.02);
            }
            
            .book-banner img {
                width: 100%;
                height: auto;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }
            
            @media (max-width: 768px) {
                .book-banner-container {
                    padding: 15px;
                    margin: 20px auto 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Track book banner clicks for analytics
function trackBookBannerClick(toolType) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'book_banner_click', {
            'event_category': 'engagement',
            'event_label': toolType + '_amazon_link',
            'value': 1
        });
    }
}