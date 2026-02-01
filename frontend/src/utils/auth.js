// Token management
export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const setAuthData = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const isAuthenticated = () => !!getToken();

export const getUserRole = () => {
    const user = getUser();
    return user?.role || null;
};

export const logout = () => {
    clearAuthData();
    window.location.href = '/login';
};
