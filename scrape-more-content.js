const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeServicePage(url, pageName) {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log(`Accessing ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle' });
        
        // Take a screenshot
        await page.screenshot({ 
            path: `${pageName}-screenshot.png`, 
            fullPage: true 
        });
        
        // Extract all text content
        const content = await page.evaluate(() => {
            // Remove scripts and styles
            const scripts = document.querySelectorAll('script, style, nav, footer, .sidebar, #sidebar');
            scripts.forEach(el => el.remove());
            
            // Get main content area
            const mainContent = document.querySelector('main, .main-content, .content, .post-content, article') || document.body;
            
            // Extract headings, paragraphs, lists, and other content
            const elements = mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, .service-item, .contact-info');
            
            let extractedContent = [];
            elements.forEach(el => {
                const tagName = el.tagName.toLowerCase();
                const text = el.innerText.trim();
                if (text && text.length > 3) {
                    extractedContent.push({
                        tag: tagName,
                        text: text,
                        className: el.className
                    });
                }
            });
            
            return {
                title: document.title,
                url: window.location.href,
                content: extractedContent
            };
        });
        
        // Save content to file
        fs.writeFileSync(`${pageName}-content.json`, JSON.stringify(content, null, 2));
        console.log(`Content saved to ${pageName}-content.json`);
        
        return content;
        
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return null;
    } finally {
        await browser.close();
    }
}

// Function to scrape additional service pages
async function scrapeMoreServices() {
    const services = [
        { url: 'https://newinabudhabi.com/visa-legal-help', name: 'visa-legal-help' },
        { url: 'https://newinabudhabi.com/newcomer-setup', name: 'newcomer-setup' },
        { url: 'https://newinabudhabi.com/transport-driving-license', name: 'transport-driving-license' }
    ];
    
    for (const service of services) {
        await scrapeServicePage(service.url, service.name);
        // Wait between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Run the scraper
scrapeMoreServices().catch(console.error);