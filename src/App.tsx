import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  setDoc,
  Timestamp,
  serverTimestamp,
  getDocFromServer,
  or
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  getRedirectResult,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { 
  MapPin, 
  Calendar, 
  Search, 
  PlusCircle, 
  LogOut, 
  LogIn, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Heart, 
  Share2, 
  ShieldCheck,
  Globe,
  Instagram,
  Twitter,
  ExternalLink,
  Filter,
  ArrowRight,
  Menu,
  X,
  Upload,
  Image as ImageIcon,
  Pencil,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  role: 'user' | 'admin';
}

interface TravelPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title: string;
  content: string;
  introImage: string;
  otherImages: string[];
  location: {
    name: string;
    lat?: number;
    lng?: number;
  };
  timestamp: any;
  status: 'pending' | 'verified' | 'rejected';
  reactions: {
    count: number;
    userIds: string[];
  };
  commentsCount: number;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
  };
}

// --- Components ---

const Navbar = ({ user, profile, onLogin, onLogout, onOpenPostForm }: { 
  user: FirebaseUser | null, 
  profile: UserProfile | null,
  onLogin: () => void, 
  onLogout: () => void,
  onOpenPostForm: () => void
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">Wander<span className="text-emerald-600">Log</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <button 
                  onClick={onOpenPostForm}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                >
                  <PlusCircle className="w-4 h-4" />
                  Share Story
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{profile?.displayName || user.displayName}</p>
                    <p className="text-xs text-slate-500 capitalize">{profile?.role || 'User'}</p>
                  </div>
                  <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-emerald-50" />
                  <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={onLogin}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-600">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white border-b border-slate-100 px-4 py-6 space-y-4"
          >
            {user ? (
              <>
                <button 
                  onClick={() => { onOpenPostForm(); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  Share Story
                </button>
                <button 
                  onClick={() => { onLogout(); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                onClick={() => { onLogin(); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-medium"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  timestamp: any;
}

const PostCard = ({ post, onReact, onComment, isAdmin, onVerify, onReject, onEdit, onDelete, onOpenDetail, currentUserId }: { 
  post: TravelPost, 
  onReact: (id: string) => void,
  onComment: (postId: string, text: string) => Promise<void>,
  isAdmin?: boolean,
  onVerify?: (id: string) => void,
  onReject?: (id: string) => void,
  onEdit?: (post: TravelPost) => void,
  onDelete?: (id: string) => void,
  onOpenDetail: (post: TravelPost) => void,
  currentUserId?: string
}) => {
  const date = post.timestamp?.toDate ? post.timestamp.toDate() : new Date();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [imageError, setImageError] = useState(false);

  const isOwner = currentUserId === post.authorId;
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return unsubscribe;
  }, [showComments, post.id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onComment(post.id, commentText);
    setCommentText('');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = `Check out this travel story: ${post.title} on WanderLog!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard! Share it with your friends.');
    }
  };
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: [0, -4, 0],
        scale: 1,
        transition: {
          y: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2
          }
        }
      }}
      whileHover={{ 
        y: -12, 
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative z-10"
      onClick={() => onOpenDetail(post)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img 
          src={(!imageError && post.introImage) 
            ? post.introImage 
            : `https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800&h=500`} 
          alt={post.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center p-4">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Image Unavailable</p>
            </div>
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          {post.status === 'verified' ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : post.status === 'rejected' ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/90 backdrop-blur-md text-white text-xs font-bold rounded-full">
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 backdrop-blur-md text-white text-xs font-bold rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              Pending Review
            </span>
          )}
        </div>
        
        {canManage && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit?.(post); }}
              className="p-2.5 bg-white/95 backdrop-blur-md text-slate-700 rounded-full hover:bg-white transition-all shadow-lg border border-slate-100"
              title="Edit Story"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(post.id); }}
              className="p-2.5 bg-rose-500/95 backdrop-blur-md text-white rounded-full hover:bg-rose-600 transition-all shadow-lg border border-rose-400/20"
              title="Delete Story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 pr-4 rounded-full text-white">
            <img 
              src={post.authorPhoto || ''} 
              alt="" 
              className="w-8 h-8 rounded-full border border-white/20" 
              referrerPolicy="no-referrer"
            />
            <span className="text-sm font-medium">{post.authorName}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              {post.location.name}
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{post.title}</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{format(date, 'MMM d, yyyy')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); onReact(post.id); }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-rose-500 transition-colors group/btn"
            >
              <Heart className="w-5 h-5 group-hover/btn:fill-rose-500" />
              <span className="text-sm font-medium">{post.reactions.count}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">{post.commentsCount}</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {post.socialLinks?.instagram && (
              <a 
                href={post.socialLinks.instagram} 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 text-slate-400 hover:text-pink-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            <button 
              onClick={handleShare}
              className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4 pt-4 border-t border-slate-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-40 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img 
                      src={c.authorPhoto || ''} 
                      alt="" 
                      className="w-6 h-6 rounded-full flex-shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="bg-slate-50 rounded-2xl px-3 py-2 flex-1">
                      <p className="text-xs font-bold text-slate-900">{c.authorName}</p>
                      <p className="text-xs text-slate-600">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <button type="submit" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {isAdmin && post.status === 'pending' && (
          <div className="flex gap-2 pt-4">
            <button 
              onClick={() => onVerify?.(post.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Verify Post
            </button>
            <button 
              onClick={() => onReject?.(post.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const StoryDetail = ({ post, onClose }: { post: TravelPost, onClose: () => void }) => {
  const date = post.timestamp?.toDate ? post.timestamp.toDate() : new Date();
  
  // Split content by paragraphs and infuse images
  const paragraphs = post.content.split('\n').filter(p => p.trim());
  const otherImages = post.otherImages || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8 relative flex flex-col max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-30 p-2.5 bg-white/90 backdrop-blur-md rounded-full text-slate-900 hover:bg-white transition-all shadow-xl border border-slate-100"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="h-[40vh] relative flex-shrink-0 bg-slate-100">
          <img 
            src={post.introImage || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200&h=800`} 
            alt={post.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200&h=800`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest mb-2">
              <MapPin className="w-4 h-4" />
              {post.location.name}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{post.title}</h1>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <img 
                src={post.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} 
                alt="" 
                className="w-12 h-12 rounded-full border-2 border-slate-100" 
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-bold text-slate-900">{post.authorName}</p>
                <p className="text-sm text-slate-500">{format(date, 'MMMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-6">
            {paragraphs.map((p, i) => (
              <React.Fragment key={i}>
                <p className="text-lg text-slate-700 leading-relaxed">{p}</p>
                {otherImages[i] && (
                  <div className="my-8 rounded-2xl overflow-hidden shadow-lg aspect-video bg-slate-100">
                    <img 
                      src={otherImages[i]} 
                      alt={`Story image ${i + 1}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800&h=600`;
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
            
            {/* Show remaining images if any */}
            {otherImages.length > paragraphs.length && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {otherImages.slice(paragraphs.length).map((img, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden shadow-md aspect-video bg-slate-100">
                    <img 
                      src={img} 
                      alt={`Additional image ${i + 1}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800&h=600`;
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PostForm = ({ onClose, onPost, editingPost }: { 
  onClose: () => void, 
  onPost: (data: any, introFile: File | null, otherFiles: File[]) => Promise<void>,
  editingPost?: TravelPost | null
}) => {
  const [loading, setLoading] = useState(false);
  const [introFile, setIntroFile] = useState<File | null>(null);
  const [introPreview, setIntroPreview] = useState<string>(editingPost?.introImage || '');
  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const [otherPreviews, setOtherPreviews] = useState<string[]>(editingPost?.otherImages || []);
  
  const [formData, setFormData] = useState({
    title: editingPost?.title || '',
    content: editingPost?.content || '',
    location: editingPost?.location.name || '',
    instagram: editingPost?.socialLinks?.instagram || '',
    twitter: editingPost?.socialLinks?.twitter || ''
  });

  const handleIntroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        return;
      }
      setIntroFile(file);
      setIntroPreview(URL.createObjectURL(file));
    }
  };

  const handleOtherFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const oversizedFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024);
      
      if (oversizedFiles.length > 0) {
        alert("Some files are too large. Maximum size per image is 10MB.");
        return;
      }

      setOtherFiles(prev => [...prev, ...selectedFiles]);
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setOtherPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeOtherFile = (index: number) => {
    // If it's an existing image (string), we need to handle it differently if we were truly editing
    // For now, let's just filter the previews and files
    setOtherFiles(prev => prev.filter((_, i) => i !== (index - (otherPreviews.length - otherFiles.length))));
    setOtherPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!introPreview) {
      alert("Please upload an introductory iconic photo.");
      return;
    }
    setLoading(true);
    try {
      await onPost(formData, introFile, otherFiles);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-4 relative max-h-[90vh] flex flex-col"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{editingPost ? 'Edit Your Story' : 'Share Your Story'}</h2>
            <p className="text-sm text-slate-500">Your post will be verified before appearing in the feed.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Travel Story Heading</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Sunset at Santorini"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                Location
                {formData.location && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" /> Preview on Map
                  </a>
                )}
              </label>
              <div className="relative">
                <input 
                  required
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Oia, Greece"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              </div>
              {formData.location && (
                <div className="mt-2 rounded-xl overflow-hidden h-32 border border-slate-100 bg-slate-50 relative group">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                    className="grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                  />
                  <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-emerald-500/20 transition-all rounded-xl" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Full Travel Description</label>
            <textarea 
              required
              rows={6}
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              placeholder="Tell us about your adventure in detail..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Introductory Iconic Photo</label>
              <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 group">
                {introPreview ? (
                  <>
                    <img src={introPreview} alt="" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload className="w-8 h-8 text-white" />
                      <input type="file" accept="image/*" onChange={handleIntroChange} className="hidden" />
                    </label>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-bold text-slate-400">Upload Cover Photo</span>
                    <input type="file" accept="image/*" onChange={handleIntroChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Other Travel Photos</label>
              <div className="grid grid-cols-2 gap-2">
                {otherPreviews.slice(0, 3).map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeOtherFile(i)}
                      className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all text-slate-400">
                  <PlusCircle className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Add More</span>
                  <input type="file" multiple accept="image/*" onChange={handleOtherFilesChange} className="hidden" />
                </label>
              </div>
              {otherPreviews.length > 3 && (
                <p className="text-[10px] text-slate-400 font-medium">+{otherPreviews.length - 3} more images selected</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500" /> Instagram Link
              </label>
              <input 
                value={formData.instagram}
                onChange={e => setFormData({...formData, instagram: e.target.value})}
                placeholder="https://instagram.com/..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <Twitter className="w-4 h-4 text-blue-400" /> Twitter Link
              </label>
              <input 
                value={formData.twitter}
                onChange={e => setFormData({...formData, twitter: e.target.value})}
                placeholder="https://twitter.com/..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-4 sticky bottom-0 bg-white pb-2">
            <button 
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (editingPost ? 'Update Story' : 'Submit for Verification')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<TravelPost | null>(null);
  const [selectedPost, setSelectedPost] = useState<TravelPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending' | 'mine'>('verified');

  // Auth Listener
  useEffect(() => {
    // Handle any pending redirect results (clears state and handles errors)
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect result error:", error);
      // If we get the "missing initial state" error, it's often because of storage partitioning
      if (error.code === 'auth/missing-initial-state' || error.message?.includes('missing initial state')) {
        console.warn("Storage partitioning detected. Suggesting user to open in a new tab.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Traveler',
              email: u.email || '',
              photoURL: u.photoURL || '',
              role: u.email === 'souro81294@gmail.com' ? 'admin' : 'user'
            };
            await setDoc(doc(db, 'users', u.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Fallback timeout for loading state
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Posts Listener
  useEffect(() => {
    if (!user || !profile) {
      setPosts([]);
      return;
    }

    const postsRef = collection(db, 'posts');
    let q;

    if (profile.role === 'admin') {
      // Admins can see everything
      q = query(postsRef, orderBy('timestamp', 'desc'));
    } else {
      // Regular users can only see verified posts OR their own posts (pending/rejected)
      // This matches the security rules in firestore.rules
      q = query(
        postsRef, 
        or(
          where('status', '==', 'verified'),
          where('authorId', '==', user.uid)
        ),
        orderBy('timestamp', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TravelPost));
      setPosts(p);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return unsubscribe;
  }, [user, profile]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login Error:", err);
      
      // Handle common mobile/partitioned storage issues
      if (err.code === 'auth/popup-blocked') {
        alert("The login popup was blocked. Please enable popups for this site or open the app in a new browser tab.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore
      } else if (err.message?.includes('missing initial state') || err.code === 'auth/missing-initial-state') {
        alert("Login failed due to browser storage restrictions. Please try opening the app in a new tab or a different browser (like Chrome or Safari).");
      } else {
        alert("Login failed. Please try again or open the app in a new tab.");
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleCreatePost = async (data: any, introFile: File | null, otherFiles: File[]) => {
    if (!user) return;
    
    // Cloudinary Configuration
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dzdfswnhv';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ptqalwe1';
    
    try {
      setLoading(true);
      
      let introImageUrl = editingPost?.introImage || '';
      if (introFile) {
        const formData = new FormData();
        formData.append('file', introFile);
        formData.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Cloudinary Intro Image Upload Failed: ${errorData.error?.message || res.statusText}`);
        }
        
        const result = await res.json();
        if (!result.secure_url) {
          throw new Error("Cloudinary response missing secure_url for intro image");
        }
        introImageUrl = result.secure_url;
      }

      // Upload other images to Cloudinary
      const otherImageUrls = [...(editingPost?.otherImages || [])];
      if (otherFiles.length > 0) {
        const uploadPromises = otherFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Cloudinary Other Image Upload Failed: ${errorData.error?.message || res.statusText}`);
          }
          
          const result = await res.json();
          if (!result.secure_url) {
            throw new Error("Cloudinary response missing secure_url for other image");
          }
          return result.secure_url;
        });
        const newUrls = await Promise.all(uploadPromises);
        otherImageUrls.push(...newUrls);
      }

      if (editingPost) {
        await updateDoc(doc(db, 'posts', editingPost.id), {
          title: data.title,
          content: data.content,
          introImage: introImageUrl,
          otherImages: otherImageUrls,
          location: { name: data.location },
          status: 'pending', // Reset status for re-verification
          socialLinks: {
            instagram: data.instagram,
            twitter: data.twitter
          }
        });
      } else {
        const newPost = {
          authorId: user.uid,
          authorName: user.displayName || 'Traveler',
          authorPhoto: user.photoURL || '',
          title: data.title,
          content: data.content,
          introImage: introImageUrl,
          otherImages: otherImageUrls,
          location: { name: data.location },
          timestamp: serverTimestamp(),
          status: 'pending',
          reactions: { count: 0, userIds: [] },
          commentsCount: 0,
          socialLinks: {
            instagram: data.instagram,
            twitter: data.twitter
          }
        };
        await addDoc(collection(db, 'posts'), newPost);
      }
      setEditingPost(null);
    } catch (error: any) {
      console.error("Post creation/update failed:", error);
      alert(error.message || "An error occurred during upload.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this story? This action cannot be undone.")) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const isAdmin = profile?.role === 'admin';
      const isOwner = postSnap.data().authorId === user?.uid;

      if (isOwner || isAdmin) {
        // We use a 'deleted' status to hide it from the feed while keeping the record
        // The security rules allow this update for owners and admins
        await updateDoc(postRef, { status: 'deleted' });
      } else {
        alert("You do not have permission to delete this story.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleReact = async (postId: string) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    try {
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;

      const postData = postSnap.data() as TravelPost;
      const userIds = postData.reactions.userIds || [];
      const hasReacted = userIds.includes(user.uid);

      const newUserIds = hasReacted 
        ? userIds.filter(id => id !== user.uid)
        : [...userIds, user.uid];

      await updateDoc(postRef, {
        'reactions.count': newUserIds.length,
        'reactions.userIds': newUserIds
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleComment = async (postId: string, text: string) => {
    if (!user) return;
    const commentRef = collection(db, 'posts', postId, 'comments');
    const postRef = doc(db, 'posts', postId);
    
    try {
      await addDoc(commentRef, {
        postId,
        authorId: user.uid,
        authorName: user.displayName || 'Traveler',
        authorPhoto: user.photoURL || '',
        text,
        timestamp: serverTimestamp()
      });

      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const currentCount = (postSnap.data() as TravelPost).commentsCount || 0;
        await updateDoc(postRef, { commentsCount: currentCount + 1 });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    }
  };

  const handleVerify = async (postId: string) => {
    if (profile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'posts', postId), { status: 'verified' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleReject = async (postId: string) => {
    if (profile?.role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'posts', postId), { status: 'rejected' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isAdmin = profile?.role === 'admin';
      
      // Regular users only see verified posts or their own posts
      const canSee = isAdmin || p.status === 'verified' || p.authorId === user?.uid;
      
      if (!canSee) return false;

      if (filterStatus === 'mine') {
        return matchesSearch && p.authorId === user?.uid;
      }

      if (filterStatus === 'all') return matchesSearch;
      
      // If filtering by 'pending', only show pending posts (already restricted by canSee)
      // If filtering by 'verified', only show verified posts
      return matchesSearch && p.status === filterStatus;
    });
  }, [posts, searchTerm, filterStatus, profile, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar 
        user={user} 
        profile={profile}
        onLogin={handleLogin} 
        onLogout={handleLogout}
        onOpenPostForm={() => setShowPostForm(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
            <div className="max-w-2xl space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900"
              >
                Discover the world through <span className="text-emerald-600">authentic</span> stories.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-slate-500"
              >
                Join a premium community of travelers sharing verified experiences, stunning visuals, and real connections.
              </motion.p>
            </div>
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={handleLogin}
              className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 group"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20 w-full">
              {[
                { icon: ShieldCheck, title: "Verified Content", desc: "Every story is reviewed for authenticity before it hits your feed." },
                { icon: Globe, title: "Global Community", desc: "Connect with explorers from every corner of the planet." },
                { icon: MapPin, title: "Hidden Gems", desc: "Discover destinations you won't find in any guidebook." }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-left space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Search destinations or stories..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
              </div>
              
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
                {(['verified', 'pending', 'mine', 'all'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap",
                      filterStatus === status 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {status === 'pending' && profile?.role !== 'admin' ? 'My Pending' : 
                     status === 'mine' ? 'My Stories' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed */}
            {filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredPosts.filter(p => (p as any).status !== 'deleted').map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onReact={handleReact}
                      onComment={handleComment}
                      isAdmin={profile?.role === 'admin'}
                      onVerify={handleVerify}
                      onReject={handleReject}
                      onEdit={(p) => { setEditingPost(p); setShowPostForm(true); }}
                      onDelete={handleDeletePost}
                      onOpenDetail={(p) => setSelectedPost(p)}
                      currentUserId={user?.uid}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Filter className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No stories found</h3>
                <p className="text-slate-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Post Form Modal */}
      <AnimatePresence>
        {showPostForm && (
          <PostForm 
            editingPost={editingPost}
            onClose={() => { setShowPostForm(false); setEditingPost(null); }} 
            onPost={handleCreatePost} 
          />
        )}
      </AnimatePresence>

      {/* Story Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <StoryDetail 
            post={selectedPost} 
            onClose={() => setSelectedPost(null)} 
          />
        )}
      </AnimatePresence>

      <footer className="border-t border-slate-100 bg-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">WanderLog</span>
          </div>
          <p className="text-slate-400 text-sm">© 2026 WanderLog. All rights reserved. Built for authentic explorers.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Instagram className="w-5 h-5" /></a>
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><ExternalLink className="w-5 h-5" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
