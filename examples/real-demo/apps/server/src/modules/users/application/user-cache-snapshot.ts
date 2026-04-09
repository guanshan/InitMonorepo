import type { User, UserRole } from "../domain/user";

interface CachedUserSnapshot {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: UserRole;
  updatedAt: string;
}

interface CachedUsersPageSnapshot {
  totalItems: number;
  users: CachedUserSnapshot[];
}

const deserializeUser = (snapshot: CachedUserSnapshot): User => ({
  createdAt: new Date(snapshot.createdAt),
  email: snapshot.email,
  id: snapshot.id,
  name: snapshot.name,
  role: snapshot.role,
  updatedAt: new Date(snapshot.updatedAt),
});

const serializeUser = (user: User): CachedUserSnapshot => ({
  createdAt: user.createdAt.toISOString(),
  email: user.email,
  id: user.id,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt.toISOString(),
});

export const deserializeCachedUser = (snapshot: CachedUserSnapshot | null) =>
  snapshot ? deserializeUser(snapshot) : null;

export const deserializeCachedUsers = (snapshots: CachedUserSnapshot[]) =>
  snapshots.map(deserializeUser);

export const deserializeCachedUsersPage = (
  snapshot: CachedUsersPageSnapshot | null,
) =>
  snapshot
    ? {
        totalItems: snapshot.totalItems,
        users: deserializeCachedUsers(snapshot.users),
      }
    : null;

export const serializeUserForCache = serializeUser;

export const serializeUsersForCache = (users: User[]) =>
  users.map(serializeUser);

export const serializeUsersPageForCache = (
  users: User[],
  totalItems: number,
): CachedUsersPageSnapshot => ({
  totalItems,
  users: serializeUsersForCache(users),
});
