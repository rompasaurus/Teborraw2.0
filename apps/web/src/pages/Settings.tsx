import { Layout } from '@/components/Layout'
import { useAuthStore } from '@/store/authStore'

export function Settings() {
  const user = useAuthStore((state) => state.user)

  return (
    <Layout>
      <div id="settings-page" className="max-w-2xl mx-auto">
        <div id="settings-header" className="mb-8">
          <h1 id="settings-title" className="text-3xl font-bold text-white">Settings</h1>
          <p id="settings-subtitle" className="text-slate-400 mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Section */}
        <div id="settings-profile-section" className="card mb-6">
          <h2 id="settings-profile-title" className="text-lg font-semibold text-white mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-display-name-input" className="block text-sm font-medium text-slate-300 mb-2">
                Display Name
              </label>
              <input
                id="settings-display-name-input"
                type="text"
                defaultValue={user?.displayName}
                className="input w-full"
              />
            </div>
            <div>
              <label htmlFor="settings-email-input" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="settings-email-input"
                type="email"
                defaultValue={user?.email}
                className="input w-full"
                disabled
              />
              <p className="text-xs text-slate-500 mt-1">
                Email cannot be changed
              </p>
            </div>
            <button id="settings-profile-save-btn" className="btn-primary">Save Changes</button>
          </div>
        </div>

        {/* Tracking Settings */}
        <div id="settings-tracking-section" className="card mb-6">
          <h2 id="settings-tracking-title" className="text-lg font-semibold text-white mb-4">
            Tracking Settings
          </h2>
          <div className="space-y-4">
            <label id="settings-tracking-desktop-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Desktop Tracking</p>
                <p className="text-sm text-slate-400">
                  Track active windows and app usage
                </p>
              </div>
              <input
                id="settings-tracking-desktop-toggle"
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded"
              />
            </label>
            <label id="settings-tracking-browser-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Browser Tracking</p>
                <p className="text-sm text-slate-400">
                  Track page visits and browsing history
                </p>
              </div>
              <input
                id="settings-tracking-browser-toggle"
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded"
              />
            </label>
            <label id="settings-tracking-location-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Location Tracking</p>
                <p className="text-sm text-slate-400">
                  Track GPS location from mobile
                </p>
              </div>
              <input
                id="settings-tracking-location-toggle"
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded"
              />
            </label>
            <label id="settings-tracking-audio-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Audio Recording</p>
                <p className="text-sm text-slate-400">
                  Ambient audio capture with transcription
                </p>
              </div>
              <input
                id="settings-tracking-audio-toggle"
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded"
              />
            </label>
          </div>
        </div>

        {/* Privacy Settings */}
        <div id="settings-privacy-section" className="card mb-6">
          <h2 id="settings-privacy-title" className="text-lg font-semibold text-white mb-4">
            Privacy Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="settings-data-retention-input" className="block text-sm font-medium text-slate-300 mb-2">
                Data Retention (days)
              </label>
              <input
                id="settings-data-retention-input"
                type="number"
                defaultValue={365}
                className="input w-32"
              />
            </div>
            <label id="settings-blur-screenshots-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Blur Screenshots</p>
                <p className="text-sm text-slate-400">
                  Apply blur to captured screenshots
                </p>
              </div>
              <input id="settings-blur-screenshots-toggle" type="checkbox" className="w-5 h-5 rounded" />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div id="settings-danger-section" className="card border-red-500/50">
          <h2 id="settings-danger-title" className="text-lg font-semibold text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div id="settings-export-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Export All Data</p>
                <p className="text-sm text-slate-400">
                  Download all your data as JSON
                </p>
              </div>
              <button id="settings-export-data-btn" className="btn-secondary">Export</button>
            </div>
            <div id="settings-delete-row" className="flex items-center justify-between">
              <div>
                <p className="text-white">Delete Account</p>
                <p className="text-sm text-slate-400">
                  Permanently delete your account and all data
                </p>
              </div>
              <button id="settings-delete-account-btn" className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
