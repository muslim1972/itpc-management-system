export const getUser = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user;
    } catch {
      return null;
    }
  };

  export const getToken = () => {
    return localStorage.getItem('token');
  };
  
  export const isAuthenticated = () => {
    // Check if token exists and is valid format
    const token = getToken();
    if (!token) return false;
    
    // Optionally check token expiration here
    return true;
  };
  
  export const isAdmin = () => {
    const user = getUser();
    return user?.role === 'admin';
  };
  
  export const isUser = () => {
    const user = getUser();
    return user?.role === 'user';
  };
  
  export const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // إبلاغ التطبيق الأب (InfTeleKarbala) بتسجيل الخروج لإغلاق الـ iframe
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'capacities-logout' }, '*');
    }
  };
  
  export const getAuthHeaders = () => {
    const token = getToken();
    const user = getUser();
    return {
      'Content-Type': 'application/json',
      'X-User-Id': user?.id ? String(user.id) : '',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };