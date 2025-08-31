/*
==================================================
NEW IN ABU DHABI - SIMPLE & RELIABLE JAVASCRIPT
Easy to understand and modify
==================================================
*/

/* CONFIGURATION - Change these settings */
const CONFIG = {
    searchMinLength: 2,
    searchDelay: 300,
    contactEmail: 'info@newinabudhabi.com',
    contactPhone: '+971-XX-XXX-XXXX'
};

/* AFFILIATE LINKS - Add your URLs here */
const AFFILIATE_LINKS = {
    banking: {
        adcb: 'https://your-affiliate-link.com/adcb',
        fab: 'https://your-affiliate-link.com/fab',
        enbd: 'https://your-affiliate-link.com/enbd'
    },
    telecom: {
        etisalat: 'https://your-affiliate-link.com/etisalat',
        du: 'https://your-affiliate-link.com/du'
    }
};

/* Initialize when page loads */
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ New In Abu Dhabi - Site loaded successfully');
    
    initializeSearch();
    initializeMobileMenu();
    setupAffiliateLinks();
    
    // Track page load performance
    window.addEventListener('load', function() {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`⚡ Page loaded in ${loadTime}ms`);
    });
});

/* SEARCH FUNCTIONALITY */
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchBtn');
    
    if (!searchInput || !searchButton) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(searchInput.value);
        }, CONFIG.searchDelay);
    });
    
    searchButton.addEventListener('click', function() {
        performSearch(searchInput.value);
    });
    
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
}

function performSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const cards = document.querySelectorAll('.service-card');
    
    if (term.length < CONFIG.searchMinLength) {
        cards.forEach(card => card.style.display = 'block');
        return;
    }
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        const searchableContent = title + ' ' + description;
        
        if (searchableContent.includes(term)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    if (visibleCount === 0) {
        showNoResults(searchTerm);
    } else {
        hideNoResults();
    }
}

function showNoResults(term) {
    hideNoResults();
    const message = document.createElement('div');
    message.id = 'noResults';
    message.style.cssText = 'text-align: center; padding: 2rem; color: #666; font-style: italic;';
    message.textContent = `No services found for "${term}". Try different keywords.`;
    
    const grid = document.querySelector('.services-grid');
    if (grid) {
        grid.parentNode.insertBefore(message, grid.nextSibling);
    }
}

function hideNoResults() {
    const existing = document.getElementById('noResults');
    if (existing) {
        existing.remove();
    }
}

/* MOBILE MENU */
function initializeMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (!menuToggle || !mainNav) return;
    
    menuToggle.addEventListener('click', function() {
        mainNav.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!menuToggle.contains(event.target) && !mainNav.contains(event.target)) {
            mainNav.classList.remove('active');
            menuToggle.classList.remove('active');
        }
    });
}

/* AFFILIATE LINKS SETUP */
function setupAffiliateLinks() {
    const externalLinks = document.querySelectorAll('a[href^="http"]');
    externalLinks.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        
        link.addEventListener('click', function() {
            console.log('🔗 External link clicked:', link.href);
        });
    });
}

/* ERROR HANDLING */
window.addEventListener('error', function(event) {
    console.error('❌ JavaScript Error:', event.error?.message || 'Unknown error');
});

console.log('🚀 New In Abu Dhabi - All scripts loaded successfully!');