"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Kullanıcı adı ve şifre giriniz!");
      return;
    }

    try {
      const response = await axios.post(
        "https://localhost:7085/api/Auth/login",
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data)
      );

      toast.success("Giriş başarılı!");

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error("Kullanıcı adı veya şifre hatalı!");
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-10">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Tool Room
          </h1>

          <p className="text-gray-500 mb-8">
            CNC Takım Yönetim Sistemi giriş ekranı
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block mb-2 font-bold text-gray-800">
                Kullanıcı Adı
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border p-4 rounded-xl"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block mb-2 font-bold text-gray-800">
                Şifre
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-4 rounded-xl"
                placeholder="1234"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-800 text-white p-4 rounded-xl font-bold"
            >
              Giriş Yap
            </button>
          </form>

          <div className="mt-6 text-sm text-gray-500">
            Test kullanıcı:
            <span className="font-bold text-gray-800"> admin / 1234</span>
          </div>
        </div>
      </div>
    </>
  );
}