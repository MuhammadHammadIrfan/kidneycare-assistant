export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("kc_user");
  return user ? JSON.parse(user) : null;
}

export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("kc_user");
    sessionStorage.clear();
  }
}