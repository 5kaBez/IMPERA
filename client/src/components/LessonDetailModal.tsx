import { useEffect, useState, useRef, useCallback } from 'react';
import type { Lesson, Teacher, Review } from '../types';
import { LESSON_TYPE_COLORS } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Star, MapPin, Clock, User, BookOpen, Send, ChevronDown } from 'lucide-react';

interface LessonDetailModalProps {
  lesson: Lesson;
  onClose: () => void;
}

export default function LessonDetailModal({ lesson, onClose }: LessonDetailModalProps) {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  // Slide-up animation on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Load teacher data
  useEffect(() => {
    if (!lesson.teacher) return;
    setTeacherLoading(true);
    api
      .get<Teacher>(`/teachers/by-name?name=${encodeURIComponent(lesson.teacher)}`)
      .then(setTeacher)
      .catch(() => setTeacher(null))
      .finally(() => setTeacherLoading(false));
  }, [lesson.teacher]);

  // Check if user already left a review and prefill
  useEffect(() => {
    if (!teacher || !user) return;
    const existing = teacher.reviews.find((r) => r.userId === user.id);
    if (existing) {
      setReviewRating(existing.rating);
      setReviewText(existing.text || '');
      setReviewAnonymous(existing.anonymous);
    }
  }, [teacher, user]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  // Swipe-down gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    dragCurrentY.current = Math.max(0, dy);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dragCurrentY.current}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (dragCurrentY.current > 120) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = '';
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  };

  // Submit review
  const handleSubmitReview = async () => {
    if (!teacher || reviewRating === 0) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const newReview = await api.post<Review>(`/teachers/${teacher.id}/reviews`, {
        rating: reviewRating,
        text: reviewText.trim() || undefined,
        anonymous: reviewAnonymous,
      });

      // Refresh teacher data to update ratings and review list
      const updatedTeacher = await api.get<Teacher>(
        `/teachers/by-name?name=${encodeURIComponent(lesson.teacher)}`
      );
      setTeacher(updatedTeacher);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка при отправке отзыва');
    } finally {
      setSubmitting(false);
    }
  };

  const typeColor = LESSON_TYPE_COLORS[lesson.lessonType] || LESSON_TYPE_COLORS['Другое'];

  const formatPairLabel = (n: number) => {
    return `${n}-я пара`;
  };

  const getInitials = (review: Review) => {
    if (review.anonymous) return '?';
    if (review.user) {
      const first = review.user.firstName?.[0] || '';
      const last = review.user.lastName?.[0] || '';
      return (first + last).toUpperCase() || '?';
    }
    return '?';
  };

  const getReviewAuthorName = (review: Review) => {
    if (review.anonymous) return 'Аноним';
    if (review.user) {
      return [review.user.firstName, review.user.lastName].filter(Boolean).join(' ') || 'Студент';
    }
    return 'Студент';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${isVisible ? 'bg-black/50' : 'bg-black/0'
        }`}
    >
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full max-w-lg bg-[#F5F5F7] dark:bg-gray-950 rounded-t-2xl md:rounded-t-3xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 md:pt-4 md:pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing group/handle">
          <div className="w-10 h-1 md:w-12 md:h-1.5 rounded-full bg-gray-300 dark:bg-zinc-800 group-hover/handle:bg-gray-400 transition-colors" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Header with gradient */}
          <div className="relative px-4 md:px-6 pt-3 md:pt-4 pb-6 md:pb-8 iron-metal-bg">
            {/* Decorative blobs */}
            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--color-primary-apple)] blur-[80px] animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5 blur-[60px]" />
            </div>

            {/* Close button with enhanced hit area */}
            <div className="absolute top-3 md:top-4 right-4 md:right-5 z-20">
              <button
                onClick={handleClose}
                className="p-2 md:p-3 rounded-lg md:rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all active:scale-90 group/close"
                aria-label="Close"
              >
                <X className="w-5 md:w-6 h-5 md:h-6 text-white group-hover/close:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Lesson type badge */}
            <div className="relative z-10 animate-in fade-in slide-in-from-left duration-700">
              <span className="inline-flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-[var(--color-primary-apple)] text-black mb-4 md:mb-6 shadow-gold-glow">
                <BookOpen className="w-3 md:w-4 h-3 md:h-4" />
                {lesson.lessonType}.
              </span>

              {/* Subject */}
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight md:leading-none pr-10 md:pr-12 mb-4 md:mb-6 tracking-tight md:tracking-tighter lowercase">
                {lesson.subject}.
              </h2>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                <span className="inline-flex items-center gap-1.5 md:gap-2.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-widest px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 text-white/90 shadow-xl">
                  <Clock className="w-3 md:w-4 h-3 md:h-4 text-[var(--color-primary-apple)]" />
                  {lesson.timeStart} — {lesson.timeEnd}
                </span>
                {lesson.room && (
                  <span className="inline-flex items-center gap-1.5 md:gap-2.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-widest px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 text-white/90 shadow-xl">
                    <MapPin className="w-3 md:w-4 h-3 md:h-4 text-[var(--color-primary-apple)]" />
                    AUD. {lesson.room}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 md:gap-2.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-widest px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-2xl bg-white/5 border border-white/10 text-white/90 shadow-xl">
                  {formatPairLabel(lesson.pairNumber)}
                </span>
              </div>
            </div>
          </div>

          {/* Teacher info */}
          {lesson.teacher && (
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {lesson.teacher}
                  </p>
                  {teacherLoading ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Загрузка...</p>
                  ) : teacher ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= Math.round(teacher.avgRating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {teacher.avgRating > 0 ? teacher.avgRating.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({teacher.reviewCount}{' '}
                        {teacher.reviewCount === 1
                          ? 'отзыв'
                          : teacher.reviewCount >= 2 && teacher.reviewCount <= 4
                            ? 'отзыва'
                            : 'отзывов'}
                        )
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Преподаватель</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews section */}
          {teacher && (
            <div className="px-5 py-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                Отзывы
              </h3>

              {teacher.reviews.length === 0 ? (
                <div className="text-center py-6">
                  <Star className="w-10 h-10 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Пока нет отзывов. Будьте первым!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {teacher.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {getInitials(review)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {getReviewAuthorName(review)}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>

                          {/* Stars */}
                          <div className="flex items-center gap-0.5 mb-1.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= review.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                  }`}
                              />
                            ))}
                          </div>

                          {review.text && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {review.text}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Leave a review form */}
              {user && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                    {teacher.reviews.some((r) => r.userId === user.id)
                      ? 'Изменить отзыв'
                      : 'Оставить отзыв'}
                  </h4>

                  {/* Star rating input */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReviewRating(s)}
                        onMouseEnter={() => setReviewHover(s)}
                        onMouseLeave={() => setReviewHover(0)}
                        className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${s <= (reviewHover || reviewRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300 dark:text-gray-600'
                            }`}
                        />
                      </button>
                    ))}
                    {reviewRating > 0 && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {reviewRating === 1
                          ? 'Ужасно'
                          : reviewRating === 2
                            ? 'Плохо'
                            : reviewRating === 3
                              ? 'Нормально'
                              : reviewRating === 4
                                ? 'Хорошо'
                                : 'Отлично'}
                      </span>
                    )}
                  </div>

                  {/* Text input */}
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Комментарий (необязательно)"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
                    maxLength={500}
                  />

                  {/* Anonymous toggle + Submit */}
                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={reviewAnonymous}
                        onChange={(e) => setReviewAnonymous(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/40 bg-gray-50 dark:bg-gray-900"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Анонимно
                      </span>
                    </label>

                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewRating === 0 || submitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 dark:disabled:text-gray-500 transition-colors"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {submitting ? 'Отправка...' : 'Отправить'}
                    </button>
                  </div>

                  {/* Error message */}
                  {submitError && (
                    <p className="mt-2 text-xs text-red-500 dark:text-red-400">{submitError}</p>
                  )}

                  {/* Success message */}
                  {submitSuccess && (
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      Отзыв успешно сохранён!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Teacher loading skeleton */}
          {lesson.teacher && teacherLoading && (
            <div className="px-5 py-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              </div>
            </div>
          )}

          {/* Bottom safe area padding */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
