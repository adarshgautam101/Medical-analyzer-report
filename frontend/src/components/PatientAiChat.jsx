import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Sparkles, AlertCircle, Trash2, X, RefreshCw } from 'lucide-react'
import { sendPatientChatMessage } from '../services/dashboardService'

const PREDEFINED_QUESTIONS = [
  'Summarize the latest report',
  'What are the abnormal values?',
  'Which parameters need attention?',
  'What has changed from the previous report?',
  'Compare the latest 3 reports',
  'Which parameters are consistently abnormal?',
]

export default function PatientAiChat({ patientId, patientName }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setMessages([])
    setError(null)
    setIsLoading(false)
    setIsOpen(false)
  }, [patientId])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, isOpen])

  
  useEffect(() => {
    const handleKeyDownGlobal = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDownGlobal)
    return () => window.removeEventListener('keydown', handleKeyDownGlobal)
  }, [isOpen])

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return

    const userMessage = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]
    
    setMessages(updatedMessages)
    setIsLoading(true)
    setError(null)

    try {
      const data = await sendPatientChatMessage(patientId, updatedMessages)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      console.error('[AiChat] Error sending message:', err)
      setError('AI service is temporarily unavailable. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return
    sendMessage(inputText)
    setInputText('')
  }

  const handlePredefinedClick = (question) => {
    sendMessage(question)
  }

  const handleRetry = async () => {
    if (messages.length === 0 || isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const data = await sendPatientChatMessage(patientId, messages)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      console.error('[AiChat] Error retrying message:', err)
      setError('AI service is temporarily unavailable. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndChatConfirm = () => {
    setMessages([])
    setInputText('')
    setIsLoading(false)
    setError(null)
    setShowConfirmModal(false)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="relative">
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 z-[9999] group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="AI Clinical Assistant"
        title="AI Clinical Assistant"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
      </button>

      
      <div
        className={`fixed z-[9998] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right
          right-6 bottom-[90px] w-[380px] h-[560px] max-h-[calc(100vh-120px)] rounded-2xl
          max-md:left-3 max-md:right-3 max-md:bottom-3 max-md:w-auto max-md:h-[calc(100vh-24px)] max-md:max-h-none
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'}
        `}
      >
        
        <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50 flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 text-xs tracking-tight truncate">AI Clinical Assistant</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/50 rounded-full px-1.5 py-0.5 text-[9px] font-bold flex-shrink-0">
                  Local AI
                </span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">
                Patient: <span className="text-gray-700 font-semibold">{patientName}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {messages.length > 0 && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                title="End Chat Session"
              >
                <Trash2 className="w-3 h-3" />
                <span>End</span>
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-655 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Minimize Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/40">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-start text-center py-6 px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-650 mb-3 border border-blue-100/50 shadow-sm flex-shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Ask about this patient's reports</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[240px] leading-relaxed mb-6 flex-shrink-0">
                Review the available medical reports and lab values.
              </p>

              <div className="w-full space-y-2 text-left">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1 flex-shrink-0">
                  Suggested Questions
                </p>
                <div className="space-y-1.5">
                  {PREDEFINED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handlePredefinedClick(question)}
                      disabled={isLoading}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-gray-700 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all duration-150 shadow-sm hover:shadow font-medium hover:text-blue-700 flex items-center gap-2 group disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                      <span className="leading-snug">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl shadow-sm border text-xs leading-relaxed ${isUser
                          ? 'bg-blue-600 border-blue-600 text-white rounded-br-none'
                          : 'bg-white border-gray-150 text-gray-900 rounded-bl-none'
                        }`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1 text-[9px] text-blue-500 font-bold uppercase tracking-wider mb-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI Assistant
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-150 text-gray-900 rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-sm max-w-[85%]">
                <div className="flex items-center gap-1.5 text-[9px] text-blue-500 font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-2.5 h-2.5 animate-spin" />
                  AI Assistant
                </div>
                <div className="flex items-center gap-1 py-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-700 font-medium">{error}</p>
                <button
                  onClick={() => handleRetry()}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Question
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        
        <form onSubmit={handleSend} className="flex-shrink-0 p-3.5 border-t border-gray-100 bg-white">
          <div className="relative flex items-center">
            <textarea
              rows="1"
              placeholder={`Ask about ${patientName}'s medical data...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 rounded-xl pl-4 pr-12 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-450 resize-none max-h-24 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors shadow-sm"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        
        {showConfirmModal && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 max-w-xs w-full mx-auto relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="absolute top-3.5 right-3.5 text-gray-450 hover:text-gray-650 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-650 flex-shrink-0">
                  <Trash2 className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-xs">End this chat?</h4>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    This will permanently clear the current temporary conversation. Patient reports and medical records will not be affected.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 border border-gray-250 text-gray-700 rounded-lg text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEndChatConfirm}
                  className="px-3 py-1.5 bg-red-605 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold shadow-sm transition-colors"
                >
                  End Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
