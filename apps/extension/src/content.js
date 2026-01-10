// Teboraw Browser Extension - Content Script
// Captures visible webpage content when user scrolls or lingers

const LINGER_THRESHOLD_MS = 5000 // 5 seconds of no scroll = lingering
const SCROLL_CAPTURE_DELAY_MS = 2000 // Wait 2 seconds after scrolling stops
const MAX_TEXT_LENGTH = 50000 // Max characters to capture per page

let scrollTimeout = null
let lingerTimeout = null
let lastScrollTime = Date.now()
let capturedSections = new Set()
let pageContent = {
  url: window.location.href,
  title: document.title,
  sections: [],
  capturedAt: new Date().toISOString(),
}

// Extract visible text from the viewport
function extractVisibleText() {
  const viewportHeight = window.innerHeight
  const scrollY = window.scrollY

  // Get all text nodes in the viewport
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        // Skip script, style, and hidden elements
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        const tagName = parent.tagName.toLowerCase()
        if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT
        }

        const computedStyle = window.getComputedStyle(parent)
        if (
          computedStyle.display === 'none' ||
          computedStyle.visibility === 'hidden' ||
          computedStyle.opacity === '0'
        ) {
          return NodeFilter.FILTER_REJECT
        }

        // Check if element is in viewport
        const rect = parent.getBoundingClientRect()
        const isInViewport =
          rect.top < viewportHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0

        return isInViewport ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      },
    }
  )

  const texts = []
  let node
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim()
    if (text.length > 10) {
      // Only capture meaningful text
      texts.push(text)
    }
  }

  return texts.join(' ').slice(0, MAX_TEXT_LENGTH)
}

// Extract main content (article, main, or body text)
function extractMainContent() {
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '.article-content',
    '.post-content',
    '#content',
    '.content',
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) {
      return cleanText(element.innerText).slice(0, MAX_TEXT_LENGTH)
    }
  }

  // Fallback to body
  return cleanText(document.body.innerText).slice(0, MAX_TEXT_LENGTH)
}

// Clean and normalize text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim()
}

// Extract metadata from the page
function extractMetadata() {
  const metadata = {
    title: document.title,
    description: '',
    keywords: '',
    author: '',
    publishedDate: '',
    ogImage: '',
  }

  // Description
  const descMeta = document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]')
  if (descMeta) metadata.description = descMeta.content

  // Keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]')
  if (keywordsMeta) metadata.keywords = keywordsMeta.content

  // Author
  const authorMeta = document.querySelector('meta[name="author"]') ||
    document.querySelector('meta[property="article:author"]')
  if (authorMeta) metadata.author = authorMeta.content

  // Published date
  const dateMeta = document.querySelector('meta[property="article:published_time"]') ||
    document.querySelector('meta[name="date"]')
  if (dateMeta) metadata.publishedDate = dateMeta.content

  // OG Image
  const imageMeta = document.querySelector('meta[property="og:image"]')
  if (imageMeta) metadata.ogImage = imageMeta.content

  return metadata
}

// Capture current viewport content
function captureCurrentView() {
  const scrollPosition = Math.floor(window.scrollY / 1000) // Round to nearest 1000px
  const sectionKey = `${window.location.href}:${scrollPosition}`

  // Avoid capturing the same section multiple times
  if (capturedSections.has(sectionKey)) {
    return
  }

  capturedSections.add(sectionKey)

  const visibleText = extractVisibleText()

  if (visibleText.length > 50) {
    pageContent.sections.push({
      scrollPosition,
      timestamp: new Date().toISOString(),
      text: visibleText,
    })

    console.log(`📄 Captured ${visibleText.length} chars at scroll position ${scrollPosition}`)
  }
}

// Handle scroll events
function handleScroll() {
  lastScrollTime = Date.now()

  // Clear existing timeouts
  if (scrollTimeout) clearTimeout(scrollTimeout)
  if (lingerTimeout) clearTimeout(lingerTimeout)

  // Capture after scroll stops
  scrollTimeout = setTimeout(() => {
    captureCurrentView()
  }, SCROLL_CAPTURE_DELAY_MS)

  // Set up linger detection
  lingerTimeout = setTimeout(() => {
    captureCurrentView()
    sendPageContent()
  }, LINGER_THRESHOLD_MS)
}

// Send captured content to background script
function sendPageContent() {
  if (pageContent.sections.length === 0) return

  // Also capture main content
  const mainContent = extractMainContent()
  const metadata = extractMetadata()

  chrome.runtime.sendMessage({
    type: 'PAGE_CONTENT',
    data: {
      url: pageContent.url,
      title: pageContent.title,
      metadata,
      mainContent,
      sections: pageContent.sections,
      totalLength: mainContent.length,
      sectionCount: pageContent.sections.length,
      capturedAt: pageContent.capturedAt,
    },
  })

  console.log(`📤 Sent page content: ${mainContent.length} chars, ${pageContent.sections.length} sections`)

  // Reset for next capture
  pageContent.sections = []
  capturedSections.clear()
}

// Initialize
function init() {
  // Capture initial viewport
  setTimeout(() => {
    captureCurrentView()
  }, 2000) // Wait 2 seconds after page load

  // Listen for scroll events
  window.addEventListener('scroll', handleScroll, { passive: true })

  // Capture when user leaves the page
  window.addEventListener('beforeunload', () => {
    sendPageContent()
  })

  console.log('📋 Teboraw content script loaded')
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
