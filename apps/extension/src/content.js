// Teboraw Browser Extension - Content Script
// Captures visible webpage content when user scrolls or lingers

const LINGER_THRESHOLD_MS = 5000 // 5 seconds of no scroll = lingering
const SCROLL_CAPTURE_DELAY_MS = 2000 // Wait 2 seconds after scrolling stops
const MAX_TEXT_LENGTH = 50000 // Max characters to capture per page
const MESSAGE_RETRY_ATTEMPTS = 3
const MESSAGE_RETRY_DELAY_MS = 1000

// =============================================================================
// DEBUG LOGGING
// =============================================================================
const DEBUG = true
const LOG_PREFIX = '[Teboraw CS]'

function log(...args) {
  if (DEBUG) console.log(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logError(...args) {
  console.error(LOG_PREFIX, new Date().toISOString(), 'ERROR:', ...args)
}

function logWarn(...args) {
  if (DEBUG) console.warn(LOG_PREFIX, new Date().toISOString(), 'WARN:', ...args)
}

// =============================================================================
// STATE
// =============================================================================
let scrollTimeout = null
let lingerTimeout = null
let lastScrollTime = Date.now()
let capturedSections = new Set()
let messageFailureCount = 0
let isExtensionConnected = true

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
    log('Section already captured:', sectionKey)
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

    log('Captured', visibleText.length, 'chars at scroll position', scrollPosition)
  } else {
    log('Skipped capture - text too short:', visibleText.length, 'chars')
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

// =============================================================================
// MESSAGE SENDING WITH RETRY
// =============================================================================

// Send message to background with retry logic
async function sendMessageWithRetry(message, attempts = MESSAGE_RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await chrome.runtime.sendMessage(message)

      // Check for extension context invalidation
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message)
      }

      // Success - reset failure count
      messageFailureCount = 0
      isExtensionConnected = true
      return response
    } catch (error) {
      const errorMessage = error.message || 'Unknown error'

      // Check for common disconnection errors
      if (
        errorMessage.includes('Extension context invalidated') ||
        errorMessage.includes('Could not establish connection') ||
        errorMessage.includes('Receiving end does not exist')
      ) {
        logError(`Message failed (attempt ${i + 1}/${attempts}):`, errorMessage)
        messageFailureCount++
        isExtensionConnected = false

        if (i < attempts - 1) {
          log(`Retrying in ${MESSAGE_RETRY_DELAY_MS}ms...`)
          await new Promise(resolve => setTimeout(resolve, MESSAGE_RETRY_DELAY_MS))
        }
      } else {
        // Other errors - don't retry
        logError('Message failed with non-retryable error:', errorMessage)
        throw error
      }
    }
  }

  logError(`Message failed after ${attempts} attempts - extension may need reload`)
  return null
}

// Send captured content to background script
async function sendPageContent() {
  if (pageContent.sections.length === 0) {
    log('No sections to send')
    return
  }

  // Also capture main content
  const mainContent = extractMainContent()
  const metadata = extractMetadata()

  const messageData = {
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
  }

  log('Sending page content:', mainContent.length, 'chars,', pageContent.sections.length, 'sections')

  const response = await sendMessageWithRetry(messageData)

  if (response) {
    log('Page content sent successfully:', response)
    // Reset for next capture
    pageContent.sections = []
    capturedSections.clear()
  } else {
    logWarn('Failed to send page content - will retry on next capture')
    // Don't clear sections - try to send them again next time
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================
function init() {
  log('Content script initializing for:', window.location.href.substring(0, 80))

  // Capture initial viewport
  setTimeout(() => {
    log('Initial viewport capture')
    captureCurrentView()
  }, 2000) // Wait 2 seconds after page load

  // Listen for scroll events
  window.addEventListener('scroll', handleScroll, { passive: true })

  // Capture when user leaves the page
  window.addEventListener('beforeunload', () => {
    log('Page unloading - sending remaining content')
    sendPageContent()
  })

  // Listen for visibility changes (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      log('Tab hidden - sending content')
      sendPageContent()
    } else {
      log('Tab visible again')
    }
  })

  // Periodic connection check
  setInterval(() => {
    if (!isExtensionConnected && messageFailureCount > 0) {
      log('Attempting to reconnect to extension...')
      // Try a simple message to check connection
      sendMessageWithRetry({ type: 'GET_STATUS' }).then(response => {
        if (response) {
          log('Reconnected to extension!')
          isExtensionConnected = true
          messageFailureCount = 0
        }
      })
    }
  }, 30000) // Check every 30 seconds

  log('Content script initialized successfully')
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
