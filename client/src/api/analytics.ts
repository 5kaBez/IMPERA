import { api } from './client';

export interface AnalyticsConfig {
  sessionToken?: string;
  userId?: number;
}

class AnalyticsService {
  private sessionToken: string = '';
  private sessionActive = false;
  private pageLoadTime: { [key: string]: number } = {};
  private navigationStart = performance.timing.navigationStart;

  /**
   * Инициализировать сессию
   */
  async initializeSession() {
    try {
      const platform = this.detectPlatform();
      const userAgent = navigator.userAgent;

      const response = await api.post('/analytics/session/start', {
        platform,
        userAgent,
      });

      this.sessionToken = response.sessionToken;
      this.sessionActive = true;

      // Сохранить в sessionStorage
      sessionStorage.setItem('analyticsSessionToken', this.sessionToken);

      // Отслеживать закрытие окна
      window.addEventListener('beforeunload', () => this.endSession());

      console.log('📊 Analytics session started:', this.sessionToken);
    } catch (error) {
      console.error('Failed to initialize analytics session:', error);
    }
  }

  /**
   * Завершить сессию
   */
  async endSession() {
    if (!this.sessionActive || !this.sessionToken) return;

    try {
      const durationSec = Math.floor((Date.now() - this.navigationStart) / 1000);
      await api.post('/analytics/session/end', {
        sessionToken: this.sessionToken,
        durationSec,
      });

      this.sessionActive = false;
      sessionStorage.removeItem('analyticsSessionToken');
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }
  }

  /**
   * Отправить событие
   */
  async trackEvent(eventName: string, category?: string, value?: number, metadata?: any) {
    if (!this.sessionToken) return;

    try {
      await api.post('/analytics/event', {
        eventType: 'custom_event',
        eventName,
        category,
        value,
        metadata,
        sessionToken: this.sessionToken,
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Отправить клик на кнопку
   */
  async trackButtonClick(buttonName: string, buttonText?: string) {
    return this.trackEvent('button_click', 'interaction', 1, { buttonName, buttonText });
  }

  /**
   * Отправить просмотр страницы
   */
  async trackPageView(page: string, referrer?: string) {
    if (!this.sessionToken) return;

    try {
      const timeOnPage = this.getTimeOnPage(page);
      await api.post('/analytics/page-view', {
        page,
        referrer,
        timeOnPage,
        sessionToken: this.sessionToken,
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Отправить поиск
   */
  async trackSearch(searchType: string, query: string, resultCount?: number, hasClicked?: boolean) {
    try {
      await api.post('/analytics/search', {
        searchType,
        query,
        resultCount,
        hasClicked,
      });
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }

  /**
   * Отправить фильтр
   */
  async trackFilter(page: string, filterType: string, filterValue: string) {
    try {
      await api.post('/analytics/filter', {
        page,
        filterType,
        filterValue,
      });
    } catch (error) {
      console.error('Failed to track filter:', error);
    }
  }

  /**
   * Отправить ошибку клиента
   */
  async trackError(message: string, stack?: string, page?: string) {
    try {
      await api.post('/analytics/client-error', {
        message,
        stack,
        page: page || window.location.pathname,
        userAgent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }

  /**
   * Отправить использование функции
   */
  async trackFeature(feature: string, action: string, value?: string) {
    try {
      await api.post('/analytics/feature', {
        feature,
        action,
        value,
      });
    } catch (error) {
      console.error('Failed to track feature:', error);
    }
  }

  /**
   * Отправить performance метрики
   */
  async trackPerformance(page: string) {
    if (!window.performance || !window.performance.timing) return;

    try {
      const timing = window.performance.timing;
      const navigation = window.performance.navigation;

      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
      const tcpTime = timing.connectEnd - timing.connectStart;
      const ttfb = timing.responseStart - timing.navigationStart;
      const fcpTime = timing.responseEnd - timing.navigationStart;

      // LCP, FID, CLS требуют Web Vitals API
      let lcpTime: number | null = null;
      let fid: number | null = null;
      let cls: number | null = null;

      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry.entryType === 'largest-contentful-paint') {
              lcpTime = lastEntry.startTime;
            }
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // Web Vitals not supported
        }
      }

      let memoryUsed: number | null = null;
      if ((performance as any).memory) {
        memoryUsed = Math.round((performance as any).memory.usedJSHeapSize / 1048576); // MB
      }

      await api.post('/analytics/performance', {
        page,
        pageLoadTime: pageLoadTime > 0 ? pageLoadTime : null,
        dnsTime: dnsTime > 0 ? dnsTime : null,
        tcpTime: tcpTime > 0 ? tcpTime : null,
        ttfb: ttfb > 0 ? ttfb : null,
        fcpTime: fcpTime > 0 ? fcpTime : null,
        lcpTime,
        fid,
        cls,
        memoryUsed,
      });
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }

  /**
   * Отправить взаимодействие с контентом
   */
  async trackContentInteraction(contentType: string, contentId: number, action: string, duration?: number) {
    try {
      await api.post('/analytics/content-interaction', {
        contentType,
        contentId,
        action,
        duration,
      });
    } catch (error) {
      console.error('Failed to track content interaction:', error);
    }
  }

  /**
   * Отслеживать подписку на функцию
   */
  async trackSubscriptionEvent(action: string) {
    return this.trackFeature('subscription', action);
  }

  /**
   * Отслеживать использование поиска преподавателей
   */
  async trackTeacherSearch(query: string, resultCount?: number) {
    return this.trackSearch('teachers', query, resultCount);
  }

  /**
   * Отслеживать просмотр расписания
   */
  async trackScheduleView(groupId?: number, dayOfWeek?: number) {
    return this.trackEvent('schedule_view', 'schedule', 1, { groupId, dayOfWeek });
  }

  /**
   * Отслеживать просмотр профиля
   */
  async trackProfileView() {
    return this.trackEvent('profile_view', 'profile', 1);
  }

  /**
   * Отслеживать отправку фидбека
   */
  async trackFeedbackSubmitted(feedbackType: string) {
    return this.trackEvent('feedback_submitted', 'feedback', 1, { feedbackType });
  }

  /**
   * Отслеживать занятие физкультурой
   */
  async trackSportsAction(action: string, sectionId?: number) {
    return this.trackEvent(`sports_${action}`, 'sports', 1, { sectionId });
  }

  /**
   * Получить сохраненный session token
   */
  getSessionToken(): string {
    return this.sessionToken || sessionStorage.getItem('analyticsSessionToken') || '';
  }

  /**
   * Определить платформу
   */
  private detectPlatform(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Telegram')) return 'telegram';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) return 'mobile';
    return 'web';
  }

  /**
   * Получить время на странице
   */
  private getTimeOnPage(page: string): number | undefined {
    const now = Date.now();
    if (!this.pageLoadTime[page]) {
      this.pageLoadTime[page] = now;
      return undefined;
    }
    return Math.floor((now - this.pageLoadTime[page]) / 1000);
  }

  /**
   * Установить обработчик для отслеживания глобальных ошибок
   */
  setupGlobalErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError(event.message, event.error?.stack, window.location.pathname);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        'Unhandled Promise Rejection: ' + String(event.reason),
        event.reason?.stack,
        window.location.pathname
      );
    });
  }
}

export const analytics = new AnalyticsService();
