import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { departmentNames } from '../utils/helpers';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      api.removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    api.setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    api.removeToken();
    setUser(null);
  };

  const isDirector = user?.role === 'director';
  const isManager = user?.role?.includes('manager') || isDirector;

  const [departments, setDepartments] = useState([]);

  const loadDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data.departments || []);
    } catch (e) {
      console.error('Failed to load departments:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadDepartments();
    } else {
      setDepartments([]);
    }
  }, [user]);

  const getDepartmentName = (key) => {
    const dept = departments.find(d => d.key === key);
    return dept ? dept.name : (departmentNames[key] || key || '');
  };

  const canAccess = (permission) => {
    if (!user) return false;
    if (isDirector) return true;
    if (user.permissions?.includes(permission)) return true;

    // Tài khoản hệ thống admin có toàn quyền CRUD riêng với phân hệ Tour.
    if (user.username?.toLowerCase() === 'admin' && permission.startsWith('tours.')) {
      return true;
    }

    const permissions = {
      'users.create': ['hr_manager'],
      'users.edit': ['hr_manager'],
      'users.delete': ['director'],
      'tours.create': ['sale_manager', 'sale_staff'],
      'tours.edit': ['sale_manager', 'sale_staff'],
      'tours.delete': ['director'],
      'bookings.create': ['sale_manager', 'sale_staff'],
      'bookings.edit': ['sale_manager', 'sale_staff'],
      'approvals.review': ['hr_manager', 'sale_manager', 'mkt_manager', 'it_manager', 'director'],
      'dashboard.revenue': ['sale_manager', 'sale_staff'],
      'staff.manage': ['hr_manager'],
      'attendance.export': ['it_manager', 'hr_manager'],
    };

    const allowedRoles = permissions[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isDirector,
      isManager,
      canAccess,
      loadUser,
      departments,
      loadDepartments,
      getDepartmentName
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
