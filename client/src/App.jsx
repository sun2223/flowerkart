import React, { useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function App() {
  const [transcriptText, setTranscriptText] = useState('')
  const [customPrompt, setCustomPrompt] = useState('Summarize the meeting transcript into:\n- Key points\n- Decisions made\n- Action items with owners and due dates if present\n- Risks or blockers\nKeep it concise, structured, and readable.')
  const [summary, setSummary] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState(null)

  const isGenerateDisabled = useMemo(() => !transcriptText.trim() || isGenerating, [transcriptText, isGenerating])
  const isSendDisabled = useMemo(() => !summary.trim() || !toEmail.trim() || isSending, [summary, toEmail, isSending])

  async function handleGenerate(e) {
    e.preventDefault()
    setMessage(null)
    setIsGenerating(true)
    try {
      const resp = await fetch(`${API_BASE}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptText, prompt: customPrompt })
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to generate summary')
      }
      setSummary(data.summary || '')
      setMessage({ type: 'success', text: 'Summary generated.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    setMessage(null)
    setIsSending(true)
    try {
      const resp = await fetch(`${API_BASE}/send-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, toEmail })
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to send email')
      }

      const previewInfo = data.previewUrl ? ` Email preview: ${data.previewUrl}` : ''
      setMessage({ type: 'success', text: `Email sent.${previewInfo}` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsSending(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setTranscriptText(String(ev.target?.result || ''))
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji' }}>
      <h2 style={{ marginBottom: 8 }}>AI Meeting Notes</h2>
      <p style={{ marginTop: 0, color: '#555' }}>Paste or upload a transcript, tweak the prompt, generate a summary, edit it, and email it.</p>

      <section style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Transcript</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input type="file" accept=".txt,.md,.rtf,.vtt,.srt,.json" onChange={handleFileChange} />
          <span style={{ color: '#777', fontSize: 13 }}>(Optional) Upload a .txt file</span>
        </div>
        <textarea
          value={transcriptText}
          onChange={(e) => setTranscriptText(e.target.value)}
          placeholder="Paste your meeting transcript here..."
          rows={10}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
      </section>

      <section style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Custom Prompt</label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={6}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
      </section>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={handleGenerate} disabled={isGenerateDisabled}>
          {isGenerating ? 'Generating…' : 'Generate Summary'}
        </button>
      </div>

      <section style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>AI Summary (editable)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Your AI-generated summary will appear here..."
          rows={12}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 8, border: '1px solid #ccc' }}
        />
      </section>

      <section style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Send via Email</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="email"
            placeholder="recipient@example.com"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <button onClick={handleSend} disabled={isSendDisabled}>
            {isSending ? 'Sending…' : 'Send Summary'}
          </button>
        </div>
        <p style={{ color: '#777', fontSize: 13, marginTop: 0 }}>
          If SMTP is not configured, the server uses a test inbox and returns a preview URL.
        </p>
      </section>

      {message && (
        <div style={{ padding: 12, borderRadius: 8, background: message.type === 'error' ? '#fde2e1' : '#e7f7ed', color: message.type === 'error' ? '#b42318' : '#107a3d' }}>
          {message.text}
        </div>
      )}

      <footer style={{ marginTop: 32, color: '#999', fontSize: 12 }}>
        API base: {API_BASE}
      </footer>
    </div>
  )
}