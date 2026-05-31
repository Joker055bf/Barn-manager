import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, Square, Loader2, Play, Pause, User, MessageCircle } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { User as UserType, UserMessage } from '../types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  users: UserType[];
}

const AudioPlayer = ({ url }: { url: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    
    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error("Audio playback error:", err);
            setIsPlaying(false);
          });
      }
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 rounded-full p-1.5 pr-3 min-w-[150px]">
      <button 
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-1" />}
      </button>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, currentUser, users }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUser?.role === 'owner';
  
  // For workers, the chat is directly with their owner
  useEffect(() => {
    if (isOpen && !isOwner && currentUser?.ownerId) {
      setSelectedUserId(currentUser.ownerId);
    }
  }, [isOpen, isOwner, currentUser]);

  const chatId = currentUser && selectedUserId ? [currentUser.id, selectedUserId].sort().join('_') : null;

  useEffect(() => {
    if (!isOpen || !chatId) return;

    const q = query(
      collection(db, 'chat_messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserMessage));
      setMessages(msgs);
      
      // Mark as read
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.receiverId === currentUser?.id && data.read === false) {
          try {
            updateDoc(docSnap.ref, { read: true });
          } catch (e) {
            console.error("Failed to mark as read", e);
          }
        }
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [isOpen, chatId, currentUser]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 45) { // 45 seconds max recording
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  if (!isOpen || !currentUser) return null;

  const handleSendText = async () => {
    if (!inputText.trim() || !chatId || !selectedUserId) return;
    
    const text = inputText;
    setInputText('');
    
    await addDoc(collection(db, 'chat_messages'), {
      chatId,
      senderId: currentUser.id,
      receiverId: selectedUserId,
      type: 'text',
      content: text,
      timestamp: new Date().toISOString(),
      read: false
    });
  };

  const getExtension = (mime: string) => {
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('aac')) return 'aac';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('wav')) return 'wav';
    return 'webm';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        options = { mimeType: 'audio/aac' };
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await uploadAudio(audioBlob, mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("لا يمكن الوصول إلى الميكروفون. تأكد من إعطاء الصلاحيات.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob, mimeType: string) => {
    if (!chatId || !selectedUserId) return;
    
    setIsUploading(true);
    try {
      const extension = getExtension(mimeType);
      const storageRef = ref(storage, `chats/${chatId}/audio_${Date.now()}.${extension}`);
      
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: mimeType
      });
      
      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error("Firebase Storage upload error:", error);
          alert("فشل في رفع المقطع الصوتي.");
          setIsUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            await addDoc(collection(db, 'chat_messages'), {
              chatId,
              senderId: currentUser.id,
              receiverId: selectedUserId,
              type: 'audio',
              content: downloadURL,
              timestamp: new Date().toISOString(),
              read: false
            });
          } catch (dbError) {
            console.error("Error saving audio URL to firestore:", dbError);
            alert("فشل في حفظ المقطع الصوتي في قاعدة البيانات.");
          } finally {
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Error uploading audio:", error);
      alert("فشل في معالجة المقطع الصوتي.");
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // If owner and no user selected, show list of workers
  if (isOwner && !selectedUserId) {
    const workers = users.filter(u => u.role === 'worker');
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
        <div className="bg-[#fcfbf4] w-full max-w-md h-[70vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col dark:bg-slate-950">
          <div className="p-5 border-b border-gray-100 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
              <MessageCircle className="text-[#3E2723] dark:text-orange-500" />
              الرسائل
            </h3>
            <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {workers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">لا يوجد عمال مضافين حالياً.</div>
            ) : (
              <div className="space-y-2">
                {workers.map(worker => (
                  <button
                    key={worker.id}
                    onClick={() => setSelectedUserId(worker.id)}
                    className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition dark:bg-slate-900 dark:border-slate-800 text-right"
                  >
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-100">{worker.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">اضغط لبدء المحادثة</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-[#fcfbf4] w-full max-w-md h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col dark:bg-slate-950">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div>
              <h3 className="font-bold text-md text-gray-800 dark:text-white">
                {isOwner ? selectedUser?.name : 'المالك'}
              </h3>
            </div>
          </div>
          <button onClick={() => isOwner ? setSelectedUserId(null) : onClose()} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 ${isMe ? 'bg-[#795548] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm dark:bg-slate-900 dark:border-slate-800 dark:text-gray-100'}`}>
                  {msg.type === 'text' ? (
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <AudioPlayer url={msg.content} />
                  )}
                  <span className={`text-[9px] block mt-1 ${isMe ? 'text-white/70 text-left' : 'text-gray-400 text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {isUploading && (
            <div className="flex justify-end">
              <div className="bg-[#795548]/50 text-white rounded-2xl p-3 rounded-tr-sm flex flex-col items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[10px]">جاري الإرسال...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-gray-100 dark:bg-slate-900 dark:border-slate-800 shrink-0">
          {isRecording ? (
            <div className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/50 animate-pulse">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping ml-2"></div>
              <span className="text-red-500 font-bold flex-1 text-sm">{formatTime(recordingTime)}</span>
              <button onClick={stopRecording} className="p-3 bg-red-500 text-white rounded-xl shadow-sm hover:bg-red-600 transition shrink-0 flex items-center justify-center w-12 h-12">
                <Square size={20} fill="currentColor" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={startRecording}
                className="p-3 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl transition shrink-0 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 h-12 w-12 flex items-center justify-center"
              >
                <Mic size={20} />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder="اكتب رسالة..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548] dark:bg-slate-800 dark:border-slate-700 dark:text-white h-12"
                />
              </div>
              <button 
                onClick={handleSendText}
                disabled={!inputText.trim()}
                className="p-3 bg-[#795548] text-white hover:bg-[#5D4037] rounded-xl transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed h-12 w-12 flex items-center justify-center"
              >
                <Send size={20} className="rotate-180 ml-1" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
