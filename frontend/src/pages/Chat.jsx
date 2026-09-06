import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { Send, MessageCircle, User, Loader, ArrowLeft, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const PAGE_SIZE = 8

export default function Chat() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendLoading, setSendLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [page, setPage] = useState(1)
  const [deleteModalTarget, setDeleteModalTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const handledTargetRef = useRef(null)

  const targetUserId = searchParams.get('userId') || location.state?.userId
  const targetUserName = location.state?.userName


  const fetchConversations = useCallback(async () => {
    try {
      const [convoRes, contactsRes] = await Promise.all([
        api.get('/api/chat/conversations'),
        user?.role === 'patient'
          ? api.get('/api/patient/doctor-access')
          : api.get('/api/doctor/patient-access-requests', { params: { status: 'approved' } }),
      ])

      const convos = convoRes.data || []
      const contacts = contactsRes.data || []

      const contactMap = new Map()
      contacts.forEach((c) => {
        const status = c.status === 'accepted' ? 'approved' : c.status
        if (status !== 'approved') return
        const otherId = user?.role === 'patient' ? c.doctor_id : c.patient_id
        const otherName = user?.role === 'patient' ? c.doctor_name : c.patient_name
        contactMap.set(otherId, otherName)
      })

      // Only conversations with messages should be listed in Conversations sidebar
      const existingConvos = convos
        .filter((c) => c.last_message)
        .map((c) => ({
          ...c,
          user_name: contactMap.get(c.user_id) || c.user_name || `User #${c.user_id.slice(-6)}`,
        }))

      setConversations(existingConvos)
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) return

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg])
      fetchConversations()
    })

    socket.on('user_typing', (data) => {
      if (data.user_id === selectedUserId) {
        setIsTyping(true)
      }
    })

    socket.on('user_stop_typing', (data) => {
      if (data.user_id === selectedUserId) {
        setIsTyping(false)
      }
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [fetchConversations, selectedUserId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openChat = useCallback(
    async (userId, initialName) => {
      setSelectedUserId(userId)
      setMessages([])

      try {
        const res = await api.get(`/api/chat/history/${userId}`)
        setMessages(res.data || [])

        let resolvedName = initialName
        if (!resolvedName) {
          try {
            const contactsRes = await (user?.role === 'patient'
              ? api.get('/api/patient/doctor-access')
              : api.get('/api/doctor/patient-access-requests', { params: { status: 'approved' } }))
            const contacts = contactsRes.data || []
            const found = contacts.find(
              (c) => (user?.role === 'patient' ? c.doctor_id : c.patient_id) === userId
            )
            if (found) {
              resolvedName = user?.role === 'patient' ? found.doctor_name : found.patient_name
            }
          } catch (e) {
            // ignore
          }
        }
        setSelectedUserName(resolvedName || `User #${userId.slice(-6)}`)
        fetchConversations()
      } catch (err) {
        console.error('Error loading chat history:', err)
        setSelectedUserName(initialName || `User #${userId.slice(-6)}`)
      }
    },
    [user?.role, fetchConversations]
  )

  useEffect(() => {
    if (targetUserId && handledTargetRef.current !== targetUserId) {
      handledTargetRef.current = targetUserId
      openChat(targetUserId, targetUserName)
    }
  }, [targetUserId, targetUserName, openChat])

  const confirmDeleteConversation = async () => {
    if (!deleteModalTarget?.userId) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/chat/conversation/${deleteModalTarget.userId}`)

      // Remove from conversations list in UI
      setConversations((prev) => prev.filter((c) => c.user_id !== deleteModalTarget.userId))

      // If this conversation was open, close it
      if (selectedUserId === deleteModalTarget.userId) {
        setSelectedUserId(null)
        setSelectedUserName('')
        setMessages([])
        handledTargetRef.current = null
        if (searchParams.get('userId') || location.state?.userId) {
          navigate('/chat', { replace: true, state: {} })
        }
      }

      setDeleteModalTarget(null)
      showToast('Conversation deleted successfully', 'success')
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      showToast(
        err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to delete conversation',
        'error'
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSend = () => {
    if (!messageText.trim() || !selectedUserId || !socketRef.current) return

    setSendLoading(true)
    socketRef.current.emit(
      'send_message',
      {
        receiver_id: selectedUserId,
        message_text: messageText.trim(),
      },
      (response) => {
        if (response?.success) {
          setMessages((prev) => [...prev, response.message])
          setMessageText('')
        } else {
          alert(response?.error || 'Failed to send message')
        }
        setSendLoading(false)
      }
    )


    socketRef.current.emit('stop_typing', { receiver_id: selectedUserId })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }


    if (socketRef.current && selectedUserId) {
      socketRef.current.emit('typing', { receiver_id: selectedUserId })
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stop_typing', { receiver_id: selectedUserId })
      }, 1500)
    }
  }


  const totalPages = Math.ceil(conversations.length / PAGE_SIZE)
  const paginatedConversations = conversations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageCircle className="w-8 h-8 text-blue-600" />
        Messages
      </h1>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200" style={{ height: '70vh' }}>
        <div className="flex h-full">

          <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {paginatedConversations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Connect with a doctor/patient to start chatting</p>
                </div>
              ) : (
                paginatedConversations.map((convo) => (
                  <div
                    key={convo.user_id}
                    className={`group relative flex items-center justify-between border-b border-gray-100 hover:bg-blue-50 transition-colors ${selectedUserId === convo.user_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => openChat(convo.user_id, convo.user_name)}
                      className="flex-1 text-left px-4 py-3 flex items-center gap-3 min-w-0"
                    >
                      <div className="p-2 bg-gray-100 rounded-full flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {convo.user_name}
                          </p>
                          {convo.unread_count > 0 && (
                            <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                              {convo.unread_count}
                            </span>
                          )}
                        </div>
                        {convo.last_message && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {convo.last_message.is_mine ? 'You: ' : ''}
                            {convo.last_message.message_text}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteModalTarget({
                          userId: convo.user_id,
                          userName: convo.user_name,
                        })
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 mr-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all flex-shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500">{page}/{totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>


          <div className={`flex-1 flex flex-col ${!selectedUserId ? 'hidden md:flex' : 'flex'}`}>
            {selectedUserId ? (
              <>

                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(null)}
                      className="md:hidden p-1 rounded hover:bg-gray-100"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{selectedUserName}</p>
                      {isTyping && (
                        <p className="text-xs text-green-600 animate-pulse">typing...</p>
                      )}
                    </div>
                  </div>
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModalTarget({
                          userId: selectedUserId,
                          userName: selectedUserName,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors flex-shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete conversation</span>
                    </button>
                  )}
                </div>


                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm">No messages yet. Say hello!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === user?.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMine
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                              }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                            <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>


                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendLoading}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sendLoading || !messageText.trim()}
                      className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
                <p className="text-lg font-medium text-gray-500">Select a conversation</p>
                <p className="text-sm mt-1">Choose someone from the left to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteModalTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100">
            <button
              type="button"
              onClick={() => !deleteLoading && setDeleteModalTarget(null)}
              disabled={deleteLoading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  Delete this conversation?
                </h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  This will permanently delete all messages in this conversation. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete conversation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
