import { AppCategory, ProductivityData } from './types'

// Default categories with common app patterns
const DEFAULT_CATEGORIES: AppCategory[] = [
  {
    name: 'Development',
    patterns: [
      'Visual Studio Code',
      'VS Code',
      'Code',
      'IntelliJ',
      'WebStorm',
      'PyCharm',
      'PhpStorm',
      'RubyMine',
      'GoLand',
      'CLion',
      'DataGrip',
      'Rider',
      'Android Studio',
      'Xcode',
      'Sublime Text',
      'Atom',
      'Vim',
      'Neovim',
      'Emacs',
      'Nova',
      'BBEdit',
      'TextMate',
      'Terminal',
      'iTerm',
      'Hyper',
      'Alacritty',
      'Warp',
      'Console',
      'PowerShell',
      'Windows Terminal',
      'Git',
      'GitHub Desktop',
      'GitKraken',
      'Tower',
      'Fork',
      'Sourcetree',
      'Docker',
      'Docker Desktop',
      'Postman',
      'Insomnia',
      'TablePlus',
      'Sequel Pro',
      'DBeaver',
      'pgAdmin',
      'MongoDB Compass',
      'Redis Desktop',
    ],
    productivityScore: 1.0,
    color: '#22c55e', // green
  },
  {
    name: 'Communication',
    patterns: [
      'Slack',
      'Discord',
      'Microsoft Teams',
      'Teams',
      'Zoom',
      'zoom.us',
      'Skype',
      'Messages',
      'Mail',
      'Outlook',
      'Gmail',
      'Thunderbird',
      'Spark',
      'Airmail',
      'Telegram',
      'WhatsApp',
      'Signal',
      'Google Meet',
      'Webex',
      'GoToMeeting',
      'BlueJeans',
      'Loom',
    ],
    productivityScore: 0.5,
    color: '#3b82f6', // blue
  },
  {
    name: 'Documentation',
    patterns: [
      'Notion',
      'Obsidian',
      'Notes',
      'Apple Notes',
      'Bear',
      'Evernote',
      'OneNote',
      'Confluence',
      'Google Docs',
      'Microsoft Word',
      'Word',
      'Pages',
      'Typora',
      'iA Writer',
      'Ulysses',
      'Roam',
      'Logseq',
      'Craft',
      'Drafts',
      'Scrivener',
      'Google Sheets',
      'Microsoft Excel',
      'Excel',
      'Numbers',
      'Airtable',
      'Coda',
    ],
    productivityScore: 0.8,
    color: '#8b5cf6', // purple
  },
  {
    name: 'Design',
    patterns: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Photoshop',
      'Illustrator',
      'InDesign',
      'Lightroom',
      'Premiere Pro',
      'After Effects',
      'Final Cut',
      'DaVinci Resolve',
      'Canva',
      'Affinity Designer',
      'Affinity Photo',
      'Affinity Publisher',
      'GIMP',
      'Inkscape',
      'Blender',
      'Cinema 4D',
      'Maya',
      'Framer',
      'Principle',
      'ProtoPie',
      'Zeplin',
      'Abstract',
    ],
    productivityScore: 0.9,
    color: '#ec4899', // pink
  },
  {
    name: 'Browsers',
    patterns: [
      'Chrome',
      'Google Chrome',
      'Firefox',
      'Safari',
      'Edge',
      'Microsoft Edge',
      'Brave',
      'Opera',
      'Arc',
      'Vivaldi',
      'Chromium',
      'Orion',
      'Tor Browser',
    ],
    productivityScore: 0.3, // Neutral - depends on content
    color: '#f59e0b', // amber
  },
  {
    name: 'Entertainment',
    patterns: [
      'Spotify',
      'Apple Music',
      'Music',
      'YouTube',
      'Netflix',
      'Twitch',
      'VLC',
      'QuickTime',
      'IINA',
      'TV',
      'Apple TV',
      'Podcasts',
      'Pocket Casts',
      'Overcast',
      'Steam',
      'Epic Games',
      'Battle.net',
      'Origin',
      'GOG Galaxy',
      'PlayStation',
      'Xbox',
    ],
    productivityScore: -0.5,
    color: '#ef4444', // red
  },
  {
    name: 'Social Media',
    patterns: [
      'Twitter',
      'X',
      'Facebook',
      'Instagram',
      'LinkedIn',
      'TikTok',
      'Reddit',
      'Snapchat',
      'Pinterest',
      'Mastodon',
      'Threads',
      'BeReal',
      'Tumblr',
    ],
    productivityScore: -0.7,
    color: '#f97316', // orange
  },
  {
    name: 'Utilities',
    patterns: [
      'Finder',
      'File Explorer',
      'Explorer',
      'System Preferences',
      'System Settings',
      'Settings',
      'Activity Monitor',
      'Task Manager',
      'Calculator',
      'Preview',
      'Archive Utility',
      'The Unarchiver',
      'Alfred',
      'Raycast',
      'Spotlight',
      '1Password',
      'Bitwarden',
      'LastPass',
      'Keychain',
      'CleanMyMac',
      'AppCleaner',
      'Disk Utility',
    ],
    productivityScore: 0.0,
    color: '#6b7280', // gray
  },
  {
    name: 'Project Management',
    patterns: [
      'Jira',
      'Linear',
      'Asana',
      'Trello',
      'Monday',
      'ClickUp',
      'Basecamp',
      'Todoist',
      'Things',
      'OmniFocus',
      'Reminders',
      'Microsoft To Do',
      'Wrike',
      'Teamwork',
    ],
    productivityScore: 0.7,
    color: '#06b6d4', // cyan
  },
]

export class AppCategorizer {
  private categories: AppCategory[]
  private categoryCache: Map<string, AppCategory> = new Map()

  constructor(customCategories?: AppCategory[]) {
    this.categories = customCategories || [...DEFAULT_CATEGORIES]
  }

  categorize(appName: string): AppCategory {
    // Check cache first
    const normalizedApp = appName.toLowerCase()
    const cached = this.categoryCache.get(normalizedApp)
    if (cached) return cached

    // Find matching category
    for (const category of this.categories) {
      for (const pattern of category.patterns) {
        if (normalizedApp.includes(pattern.toLowerCase())) {
          this.categoryCache.set(normalizedApp, category)
          return category
        }
      }
    }

    // Default uncategorized
    const uncategorized: AppCategory = {
      name: 'Uncategorized',
      patterns: [],
      productivityScore: 0.0,
      color: '#94a3b8', // slate
    }

    this.categoryCache.set(normalizedApp, uncategorized)
    return uncategorized
  }

  getProductivityData(
    appName: string,
    durationSeconds: number,
    windowTitle?: string
  ): ProductivityData {
    const category = this.categorize(appName)

    return {
      appName,
      category: category.name,
      productivityScore: category.productivityScore,
      totalSeconds: durationSeconds,
      windowTitle,
    }
  }

  // Calculate weighted productivity score for a set of app usages
  calculateOverallProductivity(usages: ProductivityData[]): number {
    if (usages.length === 0) return 0

    const totalSeconds = usages.reduce((sum, u) => sum + u.totalSeconds, 0)
    if (totalSeconds === 0) return 0

    const weightedSum = usages.reduce(
      (sum, u) => sum + u.productivityScore * u.totalSeconds,
      0
    )

    return weightedSum / totalSeconds
  }

  // Update categories (for user customization)
  setCategories(categories: AppCategory[]): void {
    this.categories = categories
    this.categoryCache.clear()
  }

  getCategories(): AppCategory[] {
    return [...this.categories]
  }

  // Add a new category
  addCategory(category: AppCategory): void {
    this.categories.push(category)
    this.categoryCache.clear()
  }

  // Remove a category by name
  removeCategory(categoryName: string): void {
    this.categories = this.categories.filter((c) => c.name !== categoryName)
    this.categoryCache.clear()
  }

  // Update an existing category
  updateCategory(categoryName: string, updates: Partial<AppCategory>): void {
    const index = this.categories.findIndex((c) => c.name === categoryName)
    if (index !== -1) {
      this.categories[index] = { ...this.categories[index], ...updates }
      this.categoryCache.clear()
    }
  }

  // Add app pattern to a category
  addAppToCategory(appName: string, categoryName: string): void {
    const category = this.categories.find((c) => c.name === categoryName)
    if (category && !category.patterns.includes(appName)) {
      category.patterns.push(appName)
      this.categoryCache.delete(appName.toLowerCase())
    }
  }

  // Remove app pattern from a category
  removeAppFromCategory(appName: string, categoryName: string): void {
    const category = this.categories.find((c) => c.name === categoryName)
    if (category) {
      category.patterns = category.patterns.filter((p) => p !== appName)
      this.categoryCache.delete(appName.toLowerCase())
    }
  }

  // Get category by name
  getCategoryByName(name: string): AppCategory | undefined {
    return this.categories.find((c) => c.name === name)
  }

  // Clear cache (useful after bulk updates)
  clearCache(): void {
    this.categoryCache.clear()
  }

  // Reset to default categories
  resetToDefaults(): void {
    this.categories = [...DEFAULT_CATEGORIES]
    this.categoryCache.clear()
  }

  // Export categories for storage
  exportCategories(): AppCategory[] {
    return JSON.parse(JSON.stringify(this.categories))
  }

  // Import categories from storage
  importCategories(categories: AppCategory[]): void {
    this.categories = categories
    this.categoryCache.clear()
  }
}

// Export default categories for reference
export { DEFAULT_CATEGORIES }
