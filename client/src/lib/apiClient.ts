// src/lib/apiClient.ts
import { getAuth } from "@clerk/clerk-react";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`, data);
  
  // Try to get the token
  let authHeaders = {};
  
  try {
    const token = await getAuth().getToken();
    if (token) {
      authHeaders = { Authorization: `Bearer ${token}` };
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      ...data ? { "Content-Type": "application/json" } : {},
      ...authHeaders
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}