import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Lightbulb, Plus, Tag, Trash2, X } from 'lucide-react'
import { thoughtsApi } from '@/services/api'
import { Layout } from '@/components/Layout'

export function Thoughts() {
  const queryClient = useQueryClient()
  const [showNewThought, setShowNewThought] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['thoughts'],
    queryFn: () => thoughtsApi.list({ pageSize: 50 }),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      thoughtsApi.create({ content: newContent, tags: newTags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] })
      setShowNewThought(false)
      setNewContent('')
      setNewTags([])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => thoughtsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] })
    },
  })

  const thoughts = data?.data?.items ?? []

  const handleAddTag = () => {
    if (tagInput.trim() && !newTags.includes(tagInput.trim())) {
      setNewTags([...newTags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag))
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Thoughts</h1>
            <p className="text-slate-400 mt-1">
              Capture and organize your ideas
            </p>
          </div>
          <button
            onClick={() => setShowNewThought(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Thought
          </button>
        </div>

        {/* New Thought Modal */}
        {showNewThought && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  New Thought
                </h2>
                <button
                  onClick={() => setShowNewThought(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What's on your mind?"
                className="input w-full h-32 resize-none mb-4"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tags
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {newTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add a tag"
                    className="input flex-1"
                  />
                  <button onClick={handleAddTag} className="btn-secondary">
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewThought(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newContent.trim() || createMutation.isPending}
                  className="btn-primary disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thoughts List */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">
            Loading thoughts...
          </div>
        ) : thoughts.length === 0 ? (
          <div className="card text-center py-12">
            <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No thoughts yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Click "New Thought" to capture your first idea
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {thoughts.map((thought) => (
              <div key={thought.id} className="card group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white whitespace-pre-wrap">
                      {thought.content}
                    </p>
                    {thought.tags.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {thought.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-3">
                      {format(new Date(thought.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(thought.id)}
                    className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
