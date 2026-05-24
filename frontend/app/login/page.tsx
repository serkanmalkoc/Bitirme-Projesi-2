"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import {
  LockKeyhole,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Radio,
  Database,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  LogIn,
  Factory,
  Gauge,
  Clock3,
  Activity,
} from "lucide-react";

const faqItems = [
  {
    question: "Bu sistem ne işe yarar?",
    answer:
      "Bu sistem, CNC tezgahlarında kullanılan kesici takımların stok durumunu, kullanım ömrünü ve kullanım geçmişini takip etmek için geliştirilmiştir. Kullanım kaydı girildiğinde takımın kalan ömrü otomatik olarak azalır.",
  },
  {
    question: "Hangi takımlar takip edilebilir?",
    answer:
      "Freze uçları, matkap uçları, elmas uçlar, torna uçları, kılavuzlar, raybalar ve benzeri CNC sarf malzemeleri sistem üzerinde takip edilebilir.",
  },
  {
    question: "Kullanım kaydı girildiğinde ne olur?",
    answer:
      "Kullanıcı bir takım seçer ve kullanım süresini dakika olarak girer. Sistem bu süreyi ilgili takımın kalan ömründen düşer ve kullanım geçmişine yeni bir kayıt ekler.",
  },
  {
    question: "Kritik stok nedir?",
    answer:
      "Kritik stok, takımın mevcut stok miktarının belirlenen kritik seviyeye eşit veya daha düşük olmasıdır. Sistem bu takımları uyarı olarak gösterir.",
  },
  {
    question: "Admin ve Operator farkı nedir?",
    answer:
      "Admin kullanıcı takım ekleyebilir, silebilir, düzenleyebilir ve raporları görebilir. Operator kullanıcı ise takımları görüntüleyebilir, kullanım kaydı ekleyebilir ve kullanım geçmişini inceleyebilir.",
  },
  {
    question: "Sistem gerçek zamanlı çalışır mı?",
    answer:
      "Evet. SignalR altyapısı sayesinde kullanım kaydı eklendiğinde ilgili takımın kalan ömrü sayfa yenilenmeden canlı olarak güncellenebilir.",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error("Kullanıcı adı ve şifre giriniz!");
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        "https://localhost:7085/api/Auth/login",
        {
          username,
          password,
        }
      );

      localStorage.setItem("user", JSON.stringify(response.data));

      toast.success("Giriş başarılı!");

      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (error) {
      console.error(error);
      toast.error("Kullanıcı adı veya şifre hatalı!");
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdmin = () => {
    setUsername("admin");
    setPassword("1234");
  };

  const fillOperator = () => {
    setUsername("operator");
    setPassword("1234");
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:56px_56px]" />

        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-blue-600/30 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-40 w-[520px] h-[520px] bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-[420px] h-[420px] bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 p-8">
          <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 lg:p-14 shadow-2xl flex flex-col justify-between min-h-[720px]">
                <div>
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-3xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-950/40">
                      TR
                    </div>

                    <div>
                      <h1 className="text-2xl font-black tracking-tight">
                        Tool Room
                      </h1>

                      <p className="text-slate-400 font-semibold">
                        CNC Takım Yönetim Sistemi
                      </p>
                    </div>
                  </div>

                  <div className="mb-10">
                    <p className="text-blue-300 font-black mb-4">
                      Dijital Takım Takip Platformu
                    </p>

                    <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
                      Akıllı CNC
                      <br />
                      Takım Yönetimi
                    </h2>

                    <p className="text-slate-300 text-lg leading-8 max-w-2xl">
                      CNC takımlarının stok seviyesini, kritik stok uyarılarını,
                      kullanım ömrünü ve kullanım geçmişini tek panelden takip
                      etmek için geliştirilmiş modern yönetim sistemi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="bg-slate-950/50 border border-white/10 rounded-3xl p-5">
                      <div className="w-12 h-12 bg-blue-500/15 text-blue-300 rounded-2xl flex items-center justify-center mb-4">
                        <ShieldCheck size={25} />
                      </div>

                      <p className="text-2xl font-black">JWT</p>

                      <p className="text-slate-400 text-sm mt-2 font-semibold">
                        Güvenli oturum
                      </p>
                    </div>

                    <div className="bg-slate-950/50 border border-white/10 rounded-3xl p-5">
                      <div className="w-12 h-12 bg-green-500/15 text-green-300 rounded-2xl flex items-center justify-center mb-4">
                        <Radio size={25} />
                      </div>

                      <p className="text-2xl font-black">Live</p>

                      <p className="text-slate-400 text-sm mt-2 font-semibold">
                        Anlık güncelleme
                      </p>
                    </div>

                    <div className="bg-slate-950/50 border border-white/10 rounded-3xl p-5">
                      <div className="w-12 h-12 bg-purple-500/15 text-purple-300 rounded-2xl flex items-center justify-center mb-4">
                        <Database size={25} />
                      </div>

                      <p className="text-2xl font-black">MySQL</p>

                      <p className="text-slate-400 text-sm mt-2 font-semibold">
                        Kalıcı veri
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Factory size={24} className="text-blue-300" />

                      <h3 className="font-black text-lg">
                        Üretim Odaklı
                      </h3>
                    </div>

                    <p className="text-slate-300 leading-7 font-medium">
                      Takım stokları, kritik seviyeler ve ömür değerleri üretim
                      sürecine uygun şekilde izlenir.
                    </p>
                  </div>

                  <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Gauge size={24} className="text-green-300" />

                      <h3 className="font-black text-lg">
                        Performans Takibi
                      </h3>
                    </div>

                    <p className="text-slate-300 leading-7 font-medium">
                      Dashboard, raporlar ve kullanım geçmişi ile takım durumu
                      hızlıca analiz edilir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white text-slate-900 rounded-[2rem] p-8 lg:p-12 shadow-2xl">
                <div className="mb-8">
                  <div className="w-16 h-16 bg-slate-950 text-white rounded-3xl flex items-center justify-center mb-6">
                    <LogIn size={30} />
                  </div>

                  <p className="text-blue-600 font-black mb-3">
                    Giriş Paneli
                  </p>

                  <h2 className="text-4xl font-black mb-3">
                    Hesabınıza giriş yapın
                  </h2>

                  <p className="text-slate-600 font-medium leading-7">
                    Devam etmek için kullanıcı adı ve şifrenizi giriniz. Sistem
                    kullanıcı rolüne göre menüleri ve yetkileri otomatik düzenler.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block mb-2 font-black text-slate-900">
                      Kullanıcı Adı
                    </label>

                    <div className="relative">
                      <User
                        size={22}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                        placeholder="admin veya operator"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 font-black text-slate-900">
                      Şifre
                    </label>

                    <div className="relative">
                      <LockKeyhole
                        size={22}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 p-4 pl-12 pr-16 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                        placeholder="Şifrenizi giriniz"
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 w-10 h-10 rounded-xl font-bold text-sm transition flex items-center justify-center"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-4 rounded-2xl font-black transition shadow-lg shadow-blue-200 flex items-center justify-center gap-3"
                  >
                    {isLoading ? (
                      <>
                        <Clock3 size={21} />
                        Giriş yapılıyor...
                      </>
                    ) : (
                      <>
                        <LogIn size={21} />
                        Giriş Yap
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8">
                  <h3 className="text-slate-900 font-black mb-4">
                    Hızlı Test Kullanıcıları
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={fillAdmin}
                      className="text-left bg-blue-50 border border-blue-100 hover:border-blue-400 hover:bg-blue-100 rounded-3xl p-5 transition"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-blue-700 font-black text-xl">
                          Admin
                        </p>

                        <ShieldCheck size={24} className="text-blue-700" />
                      </div>

                      <p className="text-slate-700 text-sm font-semibold">
                        Kullanıcı adı: admin
                      </p>

                      <p className="text-slate-700 text-sm font-semibold mt-1">
                        Şifre: 1234
                      </p>

                      <p className="text-slate-500 text-xs mt-4 leading-5">
                        Takım ekleme, silme, düzenleme ve rapor ekranlarına erişebilir.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={fillOperator}
                      className="text-left bg-green-50 border border-green-100 hover:border-green-400 hover:bg-green-100 rounded-3xl p-5 transition"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-green-700 font-black text-xl">
                          Operator
                        </p>

                        <Activity size={24} className="text-green-700" />
                      </div>

                      <p className="text-slate-700 text-sm font-semibold">
                        Kullanıcı adı: operator
                      </p>

                      <p className="text-slate-700 text-sm font-semibold mt-1">
                        Şifre: 1234
                      </p>

                      <p className="text-slate-500 text-xs mt-4 leading-5">
                        Takımları görüntüleyebilir, kullanım kaydı ekleyebilir ve geçmiş kayıtları inceleyebilir.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="mt-8 bg-slate-950 text-white rounded-3xl p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black">
                        Güvenli Oturum Yönetimi
                      </p>

                      <p className="text-slate-300 text-sm mt-1 leading-6">
                        Şifreler BCrypt ile saklanır, giriş sonrası JWT token
                        oluşturulur ve API isteklerinde kullanılır.
                      </p>
                    </div>

                    <div className="w-12 h-12 bg-green-500/20 text-green-300 rounded-2xl flex items-center justify-center font-black">
                      <ShieldCheck size={25} />
                    </div>
                  </div>
                </div>

                <p className="text-center text-slate-500 text-sm mt-8 font-medium">
                  Amasya Üniversitesi • Bitirme Projesi • Tool Room Management
                </p>
              </div>
            </div>

            <div className="mt-8 bg-white text-slate-900 rounded-[2rem] shadow-2xl p-8 lg:p-10">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center">
                    <HelpCircle size={25} />
                  </div>

                  <p className="text-blue-600 font-black">
                    Sıkça Sorulan Sorular
                  </p>
                </div>

                <h2 className="text-4xl font-black text-slate-900 mb-3">
                  Bu sistem ne işe yarar?
                </h2>

                <p className="text-slate-600 font-medium max-w-5xl leading-8">
                  Tool Room Management sistemi, CNC takımlarının stok, kullanım
                  ömrü ve kullanım geçmişini dijital ortamda takip etmek için
                  geliştirilmiştir. Sistem, takım ömrünü dakika bazlı izler,
                  kritik stok durumlarını gösterir ve kullanıcı rollerine göre
                  güvenli erişim sağlar.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {faqItems.map((item, index) => {
                  const isOpen = openFaqIndex === index;

                  return (
                    <div
                      key={item.question}
                      className={`border rounded-3xl transition ${
                        isOpen
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaqIndex(isOpen ? null : index)
                        }
                        className="w-full text-left p-6 flex items-center justify-between gap-4"
                      >
                        <span className="text-slate-900 font-black text-lg">
                          {item.question}
                        </span>

                        <span
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition ${
                            isOpen
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isOpen ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-6 pb-6">
                          <p className="text-slate-700 font-medium leading-7">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-slate-950 rounded-3xl p-7 text-white">
                <h3 className="text-2xl font-black mb-3">
                  Projenin Temel Avantajı
                </h3>

                <p className="text-slate-300 leading-8 font-medium">
                  Bu sistem sayesinde CNC takımları manuel takip yerine dijital
                  ortamda izlenir. Takım ömrü, stok durumu ve kullanım geçmişi
                  düzenli şekilde kayıt altında tutulur. Böylece üretim
                  sürecinde takım kaynaklı hatalar ve stok eksiklikleri daha
                  erken fark edilebilir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}