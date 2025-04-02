import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "../config/api";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const response = await fetch(api.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      setUser(data.user);
      router.push("/home");
    } else {
      alert(data.message || "Error en login");
    }
  };

  return { user, login };
};
