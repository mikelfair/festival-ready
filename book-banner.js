// Universal Book Banner Component for Festival Ready
// Promotes Amazon book sales and tracks clicks for analytics

function createBookBanner(containerId = 'book-banner-container', location = 'page') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Book banner container not found:', containerId);
        return;
    }
    
    // Create banner HTML
    const bannerHTML = `
        <div style="
            width: 100%;
            max-width: 728px;
            margin: 20px auto;
            padding: 0 10px;
            box-sizing: border-box;
        ">
            <a href="https://amzn.to/4naJ4FT" 
               target="_blank" 
               rel="noopener noreferrer"
               onclick="trackBookBannerClick('${location}')"
               style="
                   display: block;
                   transition: transform 0.3s ease;
                   text-decoration: none;
               "
               onmouseover="this.style.transform='scale(1.02)'"
               onmouseout="this.style.transform='scale(1)'">
                
                <img src="images/festival-books-banner.png" 
                     alt="Film Festival Submitter's Handbook and Screenplay Judging Guide - Available on Amazon"
                     style="
                         width: 100%;
                         height: auto;
                         border-radius: 8px;
                         box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                         border: none;
                     "
                     onerror="this.style.display='none'">
            </a>
        </div>
    `;
    
    container.innerHTML = bannerHTML;
}

// Track book banner clicks for Google Analytics
function trackBookBannerClick(location) {
    // Google Analytics tracking
    if (typeof gtag !== 'undefined') {
        gtag('event', 'click', {
            'event_category': 'Book_Banner',
            'event_label': location,
            'value': 1
        });
    }
    
    // Console log for debugging
    console.log('Book banner clicked from:', location);
    
    // You could also send this to your own analytics endpoint
    // fetch('/api/track-book-click', { method: 'POST', body: JSON.stringify({ location }) });
}

// Auto-initialize book banner if container exists
document.addEventListener('DOMContentLoaded', function() {
    const defaultContainer = document.getElementById('book-banner-container');
    if (defaultContainer && !defaultContainer.innerHTML.trim()) {
        createBookBanner('book-banner-container', 'auto');
    }
});