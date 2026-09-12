export function signedInHomePath(user?: { is_admin?: boolean } | null): string {
  return user?.is_admin ? "/admin" : "/dashboard";
}
