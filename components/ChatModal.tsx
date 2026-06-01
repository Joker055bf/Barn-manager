import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mic, Square, Loader2, Play, Pause, User, MessageCircle } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User as UserType, UserMessage } from '../types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  users: UserType[];
}

const DoubleCheck = ({ read, isMe }: { read: boolean; isMe: boolean }) => {
  const color = read ? 'text-[#34B7F1]' : (isMe ? 'text-white/50' : 'text-gray-400');
  return (
    <svg className={`w-3.5 h-3.5 shrink-0 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l3.5 3.5L13 8" />
      <path d="M7 12l3.5 3.5L20 8" />
    </svg>
  );
};

const get20Peaks = (recordedPeaks?: number[]) => {
  const defaultPeaks = [6, 12, 8, 14, 20, 10, 16, 22, 14, 8, 12, 18, 10, 14, 20, 14, 10, 16, 12, 6];
  if (!recordedPeaks || recordedPeaks.length === 0) {
    return defaultPeaks;
  }
  const targetCount = 20;
  const result: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const index = Math.floor((i / targetCount) * recordedPeaks.length);
    result.push(recordedPeaks[index] || 4);
  }
  return result;
};

const AudioPlayer = ({ url, isMe, peaks }: { url: string; isMe: boolean; peaks?: number[] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    if (audio.readyState >= 1) {
      onLoadedMetadata();
    }
    
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
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

  const displayPeaks = get20Peaks(peaks);

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-0.5 w-[140px] select-none" dir="rtl">
      <div className="flex items-center gap-1.5">
        <button 
          onClick={togglePlay}
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all shadow cursor-pointer ${
            isMe ? 'bg-white text-[#795548]' : 'bg-[#795548] text-white'
          }`}
        >
          {isPlaying ? <Pause size={10} fill="currentColor" stroke="none" /> : <Play size={10} className="mr-0.5" fill="currentColor" stroke="none" />}
        </button>

        <div className="flex-1 flex items-center gap-[2px] h-6 px-1 relative justify-center shrink-0">
          {displayPeaks.map((peakHeight, i) => {
            const isPlayed = i < Math.floor((progress / 100) * displayPeaks.length);
            
            let barColor = 'bg-gray-300 dark:bg-slate-700';
            if (isMe) {
              barColor = isPlayed ? 'bg-white' : 'bg-white/40';
            } else {
              barColor = isPlayed ? 'bg-[#795548] dark:bg-orange-500' : 'bg-gray-300 dark:bg-slate-700';
            }

            return (
              <div 
                key={i} 
                className={`w-[2px] rounded-full transition-all duration-150 ${barColor}`} 
                style={{ height: `${Math.max(4, peakHeight * 0.8)}px` }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center px-1 text-[8px] font-bold opacity-75">
        <span className={isMe ? 'text-white' : 'text-gray-500'}>
          {formatDuration(isPlaying ? currentTime : duration)}
        </span>
      </div>
    </div>
  );
};

const isValidAvatar = (av?: string) => !!av && (av.startsWith('data:') || av.startsWith('http') || av.startsWith('/'));

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, currentUser, users, unreadCounts = {} }) => {
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
  const recordedPeaksRef = useRef<number[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

    // Remove orderBy to avoid silent index failures, sort in-memory
    const q = query(
      collection(db, 'chat_messages'),
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserMessage));
      
      // Sort ascending in memory by timestamp string
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
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

  const notifyUser = (receiverId: string, text: string) => {
    const receiver = users?.find(u => u.id === receiverId);
    if (receiver?.fcmToken) {
      fetch('/api/sendPush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: receiver.fcmToken,
          title: `رسالة جديدة من ${currentUser.name}`,
          body: text
        })
      }).catch(err => console.error('Failed to trigger push:', err));
    }
  };

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

    notifyUser(selectedUserId, text);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
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

      const mediaRecorder = new MediaRecorder(stream, {
        ...options,
        audioBitsPerSecond: 128000 // 128 kbps high quality audio
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up Audio Analyser to capture real-time pitch/volume levels
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        recordedPeaksRef.current = [];

        const intervalId = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          let activeBins = 0;
          for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > 0) {
              sum += dataArray[i];
              activeBins++;
            }
          }
          const average = activeBins > 0 ? sum / activeBins : 0;
          // Map average volume (0-255) to a nice visual height (4px to 24px)
          const mappedHeight = Math.max(4, Math.min(24, Math.round((average / 128) * 20) + 4));
          recordedPeaksRef.current.push(mappedHeight);
        }, 120);
        recordingIntervalRef.current = intervalId;
      } catch (analyserError) {
        console.error("Error setting up audio analyser:", analyserError);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await uploadAudioBase64(audioBlob, [...recordedPeaksRef.current]);
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
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  };

  // Convert Blob directly to base64 Data URL and save to Firestore
  // Bypasses Firebase Storage entirely to fix CORS/Storage rules issues
  const uploadAudioBase64 = async (blob: Blob, peaks: number[]) => {
    if (!chatId || !selectedUserId) return;
    
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          await addDoc(collection(db, 'chat_messages'), {
            chatId,
            senderId: currentUser.id,
            receiverId: selectedUserId,
            type: 'audio',
            content: base64data,
            peaks: peaks,
            timestamp: new Date().toISOString(),
            read: false
          });
          notifyUser(selectedUserId, 'رسالة صوتية 🎤');
        } catch (dbError) {
          console.error("Error saving audio base64 to firestore:", dbError);
          alert("فشل في حفظ المقطع الصوتي في قاعدة البيانات.");
        } finally {
          setIsUploading(false);
        }
      };
    } catch (error) {
      console.error("Error converting audio to base64:", error);
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
            <h3 className="font-extrabold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              <MessageCircle className="text-[#3E2723] dark:text-orange-500" />
              الرسائل النشطة
            </h3>
            <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-slate-900/40">
            {workers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-bold">لا يوجد عمال مضافين حالياً للمراسلة.</div>
            ) : (
              <div className="space-y-2.5">
                {workers.map(worker => (
                  <button
                    key={worker.id}
                    onClick={() => setSelectedUserId(worker.id)}
                    className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all dark:bg-slate-900 dark:border-slate-800 text-right cursor-pointer"
                  >
                    {isValidAvatar(worker.avatar) ? (
                      <img 
                        src={worker.avatar} 
                        className="w-11 h-11 rounded-full object-cover shadow border border-white dark:border-slate-800 shrink-0" 
                        alt={worker.name} 
                      />
                    ) : (
                      <div className="w-11 h-11 bg-orange-100 text-[#795548] rounded-full flex items-center justify-center shrink-0">
                        <User size={22} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-gray-800 dark:text-gray-100 text-sm truncate">{worker.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">اضغط لفتح المحادثة والدردشة</p>
                    </div>
                    {unreadCounts[worker.id] > 0 && (
                      <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shrink-0 animate-pulse">
                        {unreadCounts[worker.id]}
                      </div>
                    )}
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
      <div className="bg-[#fcfbf4] w-full max-w-md h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col dark:bg-slate-950">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            {isOwner && isValidAvatar(selectedUser?.avatar) ? (
              <img 
                src={selectedUser?.avatar} 
                className="w-9 h-9 rounded-full object-cover shadow border border-white dark:border-slate-800 shrink-0" 
                alt={selectedUser?.name} 
              />
            ) : !isOwner && isValidAvatar(users.find(u => u.role === 'owner')?.avatar) ? (
              <img 
                src={users.find(u => u.role === 'owner')?.avatar} 
                className="w-9 h-9 rounded-full object-cover shadow border border-white dark:border-slate-800 shrink-0" 
                alt="Owner" 
              />
            ) : (
              <div className="w-9 h-9 bg-orange-100 text-[#795548] rounded-full flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">
                {isOwner ? selectedUser?.name : 'المالك والمشرف'}
              </h3>
            </div>
          </div>
          <button onClick={() => isOwner ? setSelectedUserId(null) : onClose()} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer dark:bg-slate-800 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50 dark:bg-slate-900/20">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-[1.25rem] p-2.5 shadow-sm ${
                  msg.type === 'audio' ? 'w-[150px] max-w-full' : 'max-w-[80%]'
                } ${
                  isMe 
                    ? 'bg-gradient-to-br from-[#795548] to-[#5D4037] text-white rounded-tr-sm shadow-premium-sm' 
                    : 'bg-white border border-gray-150 text-gray-800 rounded-tl-sm dark:bg-slate-900 dark:border-slate-800 dark:text-gray-100'
                }`}>
                  {msg.type === 'text' ? (
                    <p className="text-xs font-semibold leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <AudioPlayer url={msg.content} isMe={isMe} peaks={msg.peaks} />
                  )}
                  <div className={`flex items-center justify-end gap-1 mt-1.5 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                    <span className="text-[8px] font-bold">
                      {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' })}
                    </span>
                    {isMe && <DoubleCheck read={msg.read} isMe={isMe} />}
                  </div>
                </div>
              </div>
            );
          })}
          {isUploading && (
            <div className="flex justify-end">
              <div className="bg-gradient-to-br from-[#795548] to-[#5D4037] text-white rounded-[1.25rem] p-3 rounded-tr-sm flex items-center gap-2 shadow-sm opacity-90 animate-pulse">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-[10px] font-bold">جاري إرسال التسجيل...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-gray-100 dark:bg-slate-900 dark:border-slate-800 shrink-0">
          {isRecording ? (
            <div className="flex items-center gap-3 p-1.5 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping ml-1 shrink-0"></div>
              <span className="text-red-500 font-extrabold flex-1 text-xs">{formatTime(recordingTime)}</span>
              <button onClick={stopRecording} className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shrink-0 cursor-pointer shadow-sm">
                <Square size={16} fill="currentColor" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={startRecording}
                className="w-11 h-11 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-xl transition shrink-0 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer border border-gray-100 dark:border-slate-800"
              >
                <Mic size={18} />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder="اكتب رسالة هنا..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548] dark:bg-slate-800 dark:border-slate-700 dark:text-white h-11"
                />
              </div>
              <button 
                onClick={handleSendText}
                disabled={!inputText.trim()}
                className="w-11 h-11 bg-[#795548] hover:bg-[#5D4037] text-white rounded-xl transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-md"
              >
                <Send size={18} className="rotate-180 ml-0.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
