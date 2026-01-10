# Webpage Text Scraping Implementation

## Overview
Implemented automatic webpage content capture that extracts text from pages you visit, linger on, and scroll through. This provides comprehensive tracking of what content you're consuming online.

## What Was Implemented

### 1. Content Script (content.js)
A browser extension content script that runs on all webpages and:
- Detects when you scroll
- Detects when you linger (stay on a section for 5+ seconds)
- Extracts visible text from the viewport
- Captures main article/content
- Extracts page metadata (description, author, keywords, etc.)
- Sends captured data to background script

### 2. Smart Capture Logic
- **Linger Detection**: Captures content after 5 seconds of no scrolling
- **Scroll Capture**: Captures visible text 2 seconds after scrolling stops
- **Section Tracking**: Avoids re-capturing the same screen sections
- **Viewport Focus**: Only captures text that's actually visible to you
- **Main Content Extraction**: Intelligently finds and extracts article/main content

### 3. Text Extraction Features
- Filters out scripts, styles, and hidden elements
- Extracts only visible, meaningful text (min 10 chars)
- Normalizes whitespace and formatting
- Limits capture to 50,000 characters per page
- Cleans up text for better readability

### 4. Metadata Capture
Extracts rich metadata from pages:
- Page title
- Meta description
- Keywords
- Author
- Published date
- Open Graph image

## Files Modified

### Browser Extension
1. **[src/content.js](apps/extension/src/content.js)** - NEW
   - Content script that runs on all webpages
   - Implements scroll/linger detection
   - Extracts visible text and main content
   - Captures page metadata

2. **[src/background.js](apps/extension/src/background.js:293-319)**
   - Added `handlePageContent()` function
   - Stores captured content in PageVisit activities
   - Syncs content to backend

3. **[manifest.json](apps/extension/manifest.json:20-27)**
   - Added content_scripts configuration
   - Runs content.js on all URLs
   - Loads at document_idle for best performance

### Web Dashboard
4. **[Dashboard.tsx](apps/web/src/pages/Dashboard.tsx:377-440)**
   - Added "Page Metadata" section
   - Added "Page Content" section with full text
   - Added "Captured Sections" showing scroll history
   - All sections with expandable/scrollable views

## How It Works

### Data Flow
1. **Page Load**: Content script initializes on webpage
2. **Initial Capture**: After 2 seconds, captures first viewport
3. **Scroll Detection**: User scrolls down the page
4. **Capture After Scroll**: 2 seconds after scrolling stops, captures new viewport section
5. **Linger Detection**: If user stays on section for 5+ seconds, captures and sends data
6. **Main Content**: Extracts full article/main content
7. **Metadata**: Extracts page metadata from meta tags
8. **Send to Background**: All data sent to background script
9. **Create Activity**: Background creates PageVisit activity with content
10. **Sync to Backend**: Activity synced to server
11. **Display in Dashboard**: Content shown in expanded PageVisit activities

### Capture Triggers
1. **Page load** → Initial viewport capture (after 2s delay)
2. **Scroll stops** → Viewport capture (after 2s of no scrolling)
3. **Lingering** → Full capture and send (after 5s of no scrolling)
4. **Page unload** → Final capture before leaving

### Content Extraction Methods

**Visible Text Extraction:**
- Uses TreeWalker to find all text nodes
- Checks if element is in viewport
- Filters out hidden/invisible elements
- Skips script/style/iframe tags
- Only captures meaningful text (>10 chars)

**Main Content Extraction:**
- Tries semantic selectors first:
  - `<article>`
  - `<main>`
  - `[role="main"]`
  - `.main-content`, `.article-content`, etc.
- Falls back to `<body>` if no semantic elements found
- Cleans and normalizes extracted text

## Data Structure

### PageVisit Activity with Content
```javascript
{
  type: 'PageVisit',
  source: 'Browser',
  timestamp: '2026-01-10T...',
  data: {
    url: 'https://example.com/article',
    title: 'Article Title',
    domain: 'example.com',
    durationSeconds: 120,

    // NEW: Metadata
    metadata: {
      title: 'Article Title',
      description: 'Article description...',
      keywords: 'keyword1, keyword2',
      author: 'Author Name',
      publishedDate: '2026-01-10',
      ogImage: 'https://example.com/image.jpg'
    },

    // NEW: Main content
    mainContent: 'Full article text content...',
    totalLength: 15234,

    // NEW: Scroll sections
    sections: [
      {
        scrollPosition: 0,
        timestamp: '2026-01-10T...',
        text: 'Visible text at top of page...'
      },
      {
        scrollPosition: 1000,
        timestamp: '2026-01-10T...',
        text: 'Visible text after scrolling 1000px...'
      }
    ],
    sectionCount: 2
  }
}
```

## Dashboard Display

When you expand a PageVisit activity, you'll see:

### Basic Info
- URL (clickable link)
- Page Title
- Domain
- Duration on page

### Page Metadata Section
- Description
- Author
- Keywords
- Published date

### Page Content Section
- Shows full article/main content text
- Character count displayed
- Scrollable container (max height 384px)
- Preserves formatting with word wrapping

### Captured Sections Section
- Shows each viewport section captured during scrolling
- Each section shows:
  - Scroll position (px from top)
  - Timestamp when captured
  - Text preview (3 lines max)
- Scrollable list of all sections

## Privacy & Performance

### Privacy Considerations
- Only captures on pages you actively visit and scroll
- Content stored locally in your account
- Not shared with third parties
- Used purely for personal productivity tracking

### Performance Optimizations
- Runs at `document_idle` (after page fully loaded)
- Uses passive scroll listeners (doesn't block scrolling)
- Debounced capture (waits for scroll to stop)
- Avoids re-capturing same sections
- Limits total text length (50K chars max)
- Efficient DOM traversal with TreeWalker

### Content Filtering
- Skips `<script>`, `<style>`, `<iframe>` tags
- Filters out hidden elements (display: none, etc.)
- Only captures visible, in-viewport text
- Minimum text length requirement (10 chars)

## Usage

### Installing the Extension

1. **Open Chrome/Edge**
2. **Go to Extensions**: `chrome://extensions`
3. **Enable Developer Mode**: Toggle in top right
4. **Load Unpacked**: Click button
5. **Select Directory**: Choose `/apps/extension`
6. **Verify**: Extension should appear in toolbar

### Using the Extension

1. **Login**: Click extension icon and enter credentials
2. **Browse Normally**: Visit any webpage
3. **Scroll/Read**: Content is captured automatically as you scroll and linger
4. **View Dashboard**: Open web app to see captured content
5. **Expand Activity**: Click on PageVisit to see full content

### Captured Content Shows When
- You land on a page (after 2 seconds)
- You scroll and stop scrolling (after 2 seconds)
- You stay on a section without scrolling (after 5 seconds)
- You close/leave the page (final capture)

## Example Use Cases

1. **Research Tracking**: See exactly what articles you read
2. **Learning Analysis**: Track educational content you consume
3. **Content Discovery**: Remember interesting paragraphs you read
4. **Reading Habits**: Analyze what types of content you engage with
5. **Citation Recall**: Find that quote you read but can't remember where

## Technical Details

### Viewport Detection
```javascript
const rect = element.getBoundingClientRect()
const isInViewport =
  rect.top < viewportHeight &&
  rect.bottom > 0 &&
  rect.left < window.innerWidth &&
  rect.right > 0
```

### Section Deduplication
```javascript
const scrollPosition = Math.floor(window.scrollY / 1000) // Round to 1000px
const sectionKey = `${window.location.href}:${scrollPosition}`
if (!capturedSections.has(sectionKey)) {
  capturedSections.add(sectionKey)
  // Capture...
}
```

### Main Content Selector Priority
1. `<article>`
2. `<main>`
3. `[role="main"]`
4. `.main-content`
5. `.article-content`
6. `.post-content`
7. `#content`
8. `.content`
9. Fallback to `<body>`

## Limitations

- Max 50,000 characters per page (prevents memory issues)
- Only captures text (not images, videos, or interactive elements)
- JavaScript-rendered content must be fully loaded
- Cannot capture content in iframes
- Doesn't capture password-protected or paywalled content behind authentication

## Future Enhancements

Potential improvements:
- OCR for images
- Video transcript extraction
- PDF text extraction
- Screenshot capture of key sections
- Smart summary generation
- Duplicate content detection across pages
- Content categorization/tagging

## Conclusion

The webpage scraping feature provides comprehensive tracking of your online reading and browsing habits. It captures not just what pages you visit, but the actual content you read, helping you build a personal knowledge base of everything you consume online.
