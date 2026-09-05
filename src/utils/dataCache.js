/**
 * نظام كاش خفيف وذكي في الذاكرة (In-Memory Cache)
 * يقلل استعلامات قاعدة البيانات ويسرع التنقل بين التبويبات والصفحات
 */

const cacheStore = new Map();
const inFlightRequests = new Map();

/**
 * جلب البيانات عبر الكاش مع منع تكرار الطلبات المتزامنة (Deduplication)
 * @param {string} key - مفتاح الكاش الفريد
 * @param {Function} fetcher - دالة الاستعلام الأصلية التي تعيد Promise
 * @param {number} ttlMs - مدة بقاء البيانات في الكاش بالمللي ثانية (الافتراضي 3 دقائق)
 */
export async function fetchWithCache(key, fetcher, ttlMs = 180000) {
  const now = Date.now();
  const cached = cacheStore.get(key);

  // 1. إذا كانت البيانات موجودة في الكاش ولم تنتهِ صلاحيتها، أعدها فوراً
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  // 2. إذا كان هناك استعلام مطابق قيد التنفيذ حالياً، انتظر نفس الـ Promise لتجنب التكرار
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  // 3. تنفيذ الاستعلام الفعلي
  const promise = (async () => {
    try {
      const data = await fetcher();
      cacheStore.set(key, {
        data,
        expiry: now + ttlMs,
      });
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * إبطال وحذف مفاتيح محددة من الكاش عند حدوث تعديل أو إضافة (Mutation)
 * @param {string} keyPrefix - بادئة المفاتيح المراد مسحها (مثال: 'organizations', 'companies', 'packages')
 */
export function invalidateCache(keyPrefix = null) {
  if (!keyPrefix) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * تحديث بيانات عنصر محدد مباشرة داخل الكاش
 */
export function updateCachedData(key, updater) {
  const cached = cacheStore.get(key);
  if (cached) {
    cached.data = typeof updater === 'function' ? updater(cached.data) : updater;
  }
}
