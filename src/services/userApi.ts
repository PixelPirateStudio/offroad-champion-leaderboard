// User API Service for authentication and user-related operations

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export interface User {
  id: string;
  username: string;
  email: string | null;
  name: string;
  type: 'username' | 'apple';
  country: string;
  role: string;
  isFrozen: boolean;
  createdAt: string;
  profileId?: string; // Profile ID may be at root level
  profile: {
    id?: string; // Profile ID may be nested here
    gains: number;
    coins: number;
    coinsTemporal: number;
  };
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface MyProfileResponse {
  user: User;
  profile: {
    id: string;
    gains: number;
    coins: number;
    coinsTemporal: number;
    createdAt: string;
  };
  token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AppleLoginCredentials {
  username: string;
  type: 'apple';
}

class UserApiService {
  private getHeaders(includeAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'api': API_KEY,
    };

    if (includeAuth) {
      const token = localStorage.getItem('userToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Standard username/password login
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid username or password');
        }
        throw new Error('Login failed. Please try again.');
      }

      const data: LoginResponse = await response.json();

      // Store token temporarily
      localStorage.setItem('userToken', data.token);

      // Fetch full user profile with gains/coins
      const profileResponse = await fetch(`${API_URL}/api/v2/users/myProfile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api': API_KEY,
          'Authorization': `Bearer ${data.token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData: MyProfileResponse = await profileResponse.json();

      // Merge user and profile data
      const fullUser: User = {
        ...profileData.user,
        profile: profileData.profile,
      };

      // Store full user data in localStorage
      localStorage.setItem('userData', JSON.stringify(fullUser));

      return {
        token: data.token,
        user: fullUser,
      };
    } catch (error) {
      // Clean up token if profile fetch failed
      localStorage.removeItem('userToken');
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during login');
    }
  }

  /**
   * Apple Sign-In authentication
   */
  async loginWithApple(credentials: AppleLoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_URL}/api/v2/auth/login/apple`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Apple login failed');
        }
        throw new Error('Apple login failed. Please try again.');
      }

      const data: LoginResponse = await response.json();

      // Store token temporarily
      localStorage.setItem('userToken', data.token);

      // Fetch full user profile with gains/coins
      const profileResponse = await fetch(`${API_URL}/api/v2/users/myProfile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api': API_KEY,
          'Authorization': `Bearer ${data.token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData: MyProfileResponse = await profileResponse.json();

      // Merge user and profile data
      const fullUser: User = {
        ...profileData.user,
        profile: profileData.profile,
      };

      // Store full user data in localStorage
      localStorage.setItem('userData', JSON.stringify(fullUser));

      return {
        token: data.token,
        user: fullUser,
      };
    } catch (error) {
      // Clean up token if profile fetch failed
      localStorage.removeItem('userToken');
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during Apple login');
    }
  }

  /**
   * Validate current token and get user data from backend
   */
  async validateToken(): Promise<User | null> {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        return null;
      }

      const response = await fetch(`${API_URL}/api/v2/users/myProfile`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        // Token is invalid or expired
        return null;
      }

      const profileData: MyProfileResponse = await response.json();

      // Merge user and profile data
      const userData: User = {
        ...profileData.user,
        profile: profileData.profile,
      };

      // Update localStorage with fresh data
      localStorage.setItem('userData', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  /**
   * Refresh user profile data (use after transactions to update balance)
   */
  async refreshProfile(): Promise<User | null> {
    return this.validateToken();
  }

  /**
   * Logout (clear token and user data)
   */
  logout(): void {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  }
}

export const userApi = new UserApiService();
