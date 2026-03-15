export interface JwtAuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface JwtRefreshUser {
  sub: string;
  email: string;
  role?: string;
  refreshToken: string;
}

export interface GithubProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: Array<{
    value?: string;
    verified?: boolean;
  }>;
  photos?: Array<{
    value?: string;
  }>;
  _json?: {
    email?: string;
    email_verified?: boolean;
    avatar_url?: string;
    name?: string;
  };
}

export type RequestCookies = Record<string, string | undefined>;

export interface JwtAuthRequest {
  user: JwtAuthUser;
}

export interface JwtRefreshRequest {
  user: JwtRefreshUser;
}

export interface GithubCallbackRequest {
  user: GithubProfile;
  cookies?: RequestCookies;
}
