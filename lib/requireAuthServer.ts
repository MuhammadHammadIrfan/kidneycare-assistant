import { parse } from "cookie";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "./authToken";
import type { GetServerSidePropsContext } from "next";

export function requireAuthServer(context: GetServerSidePropsContext, allowedRoles: string[] = []) {
  const cookieHeader = context.req.headers.cookie || "";
  const cookies = parse(cookieHeader);
  const token = cookies[AUTH_COOKIE_NAME];

  if (!token) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const user = verifyAuthToken(token);

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Return user info for the page (without sensitive data)
  return { 
    props: { 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    } 
  };
}