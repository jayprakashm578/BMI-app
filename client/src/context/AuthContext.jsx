import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios.js";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("accessToken"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (userData, accessToken) => {
        setUser(userData);
        setToken(accessToken);
        localStorage.setItem("accessToken", accessToken);
        setLoading(false);
    };

    const logout = async () => {
        try {
            await api.post("/user/logout");
        } catch (error) {
            console.log(error);
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem("accessToken");
            setLoading(false);
        }
    }

    const checkAuth = async () => {
        const storedToken = localStorage.getItem("accessToken");
        if (!storedToken) {
            setLoading(false);
            return;
        }

        if (storedToken) {
            try {
                const res = await api.get("/user/me");
                setUser(res.data.user);
            } catch (error) {
                console.log("Failed to load user");
                setUser(null);
                setToken(null);
            } finally {
                setLoading(false);
            }
        }
    }
    const value = { user, token, loading, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

}