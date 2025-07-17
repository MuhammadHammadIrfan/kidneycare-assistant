import nookies from "nookies";

export function requireAuthServer(context: any, allowedRoles: string[] = []) {
  const cookies = nookies.get(context);
  const user = cookies.kc_user ? JSON.parse(cookies.kc_user) : null;

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return { props: { user } };
}