// Festival Ready v3.0 - Universal Book Banner Component
// Displays on all pages with Google Analytics tracking

/**
 * Create and inject the book banner HTML
 * @param {string} containerId - ID of container to inject banner into
 * @param {string} location - Where the banner is displayed (for tracking)
 */
function createBookBanner(containerId = 'book-banner-container', location = 'page') {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error('Book banner container not found:', containerId);
    return;
  }

  const bannerHTML = `
    <div class="book-banner" id="book-banner">
      <div class="book-cover">
        <img src="https://raw.githubusercontent.com/mikelfair/festival-ready/main/images/festival-books-banner.png" 
             alt="Film Festival Books by Mikel Fair"
             loading="lazy">
      </div>
      <div class="book-info">
        <h3>Written by Mikel Fair</h3>
        <p>Film Festival Director & Author of industry-standard guides:</p>
        <ul>
          <li><strong>Film Festival Submitter's Handbook</strong> - Your comprehensive guide to navigating the festival circuit</li>
          <li><strong>Film Festival Screenplay Judging Guide</strong> - Essential insights for screenwriters</li>
        </ul>
        <a href="https://amzn.to/4nw2sNC"
           target="_blank"
           rel="noopener"
           onclick="trackBookClick('${location}')"
           class="book-link">
          📚 Get Your Copies on Amazon →
        </a>
      </div>
    </div>
  `;

  container.innerHTML = bannerHTML;
  
  // Apply CSS if not already loaded
  if (!document.getElementById('book-banner-styles')) {
    injectBookBannerStyles();
  }
}

/**
 * Inject CSS styles for the book banner
 */
function injectBookBannerStyles() {
  const styles = `
    <style id="book-banner-styles">
      .book-banner {
        display: flex;
        align-items: center;
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        border: 2px solid #e9ecef;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .book-banner:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
      }
      
      .book-cover {
        flex-shrink: 0;
        margin-right: 20px;
      }
      
      .book-cover img {
        width: 120px;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      .book-info {
        flex: 1;
      }
      
      .book-info h3 {
        color: #2c3e50;
        font-size: 1.4em;
        margin-bottom: 8px;
        font-weight: 600;
      }
      
      .book-info p {
        color: #6c757d;
        margin-bottom: 12px;
        font-size: 1em;
        line-height: 1.5;
      }
      
      .book-info ul {
        list-style: none;
        padding: 0;
        margin-bottom: 15px;
      }
      
      .book-info li {
        color: #495057;
        margin-bottom: 6px;
        font-size: 0.95em;
        line-height: 1.4;
      }
      
      .book-link {
        display: inline-block;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white !important;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1em;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
      }
      
      .book-link:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
        text-decoration: none;
        color: white !important;
      }
      
      .book-link:active {
        transform: translateY(0);
      }
      
      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .book-banner {
          flex-direction: column;
          text-align: center;
          padding: 20px 15px;
        }
        
        .book-cover {
          margin-right: 0;
          margin-bottom: 15px;
        }
        
        .book-cover img {
          width: 100px;
        }
        
        .book-info h3 {
          font-size: 1.2em;
        }
        
        .book-info p,
        .book-info li {
          font-size: 0.9em;
        }
        
        .book-link {
          font-size: 0.95em;
          padding: 10px 20px;
        }
      }
      
      @media (max-width: 480px) {
        .book-banner {
          padding: 15px 10px;
          margin: 15px 0;
        }
        
        .book-cover img {
          width: 80px;
        }
        
        .book-info h3 {
          font-size: 1.1em;
        }
        
        .book-info ul {
          text-align: left;
        }
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

/**
 * Track book banner clicks for Google Analytics
 * @param {string} location - Where the click occurred (banner, email, etc.)
 */
function trackBookClick(location) {
  // Google Analytics tracking
  if (typeof gtag !== 'undefined') {
    gtag('event', 'click', {
      'event_category': 'Book',
      'event_label': location,
      'value': 1
    });
  }
  
  // Optional: Send to custom tracking endpoint
  if (typeof fetch !== 'undefined') {
    try {
      fetch('/api/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link_type: 'book',
          link_location: location,
          page_source: window.location.pathname,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.log('Tracking error:', err));
    } catch (e) {
      // Silent fail for tracking
    }
  }
  
  console.log('Book click tracked:', location);
}

/**
 * Initialize book banner on page load
 * Call this function when the DOM is ready
 */
function initializeBookBanner(containerId, location) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createBookBanner(containerId, location);
    });
  } else {
    createBookBanner(containerId, location);
  }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  const defaultContainer = document.getElementById('book-banner-container');
  if (defaultContainer) {
    createBookBanner('book-banner-container', 'auto');
  }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createBookBanner,
    trackBookClick,
    initializeBookBanner
  };
}