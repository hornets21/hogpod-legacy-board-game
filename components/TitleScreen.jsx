"use client";

import { useI18n } from "@/components/I18nProvider";

export default function TitleScreen({ onStartNewGame, onPlayOnline }) {
  const { t } = useI18n();
  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-[#050407] text-white select-none">
      <div className="absolute inset-0 bg-[#050407]">
        <video
          className="h-full w-full object-cover object-center"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src="/images/system/bg-title-sc.webm" type="video/webm" />
        </video>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />

      <section className="relative z-10 flex h-full w-full items-center">
        <div className="ml-[8vw] flex w-[min(27rem,70vw)] flex-col items-start pb-8 sm:ml-[10vw]">
          <div className="mb-14 sm:mb-16">
            <div className="mb-2 text-[clamp(2.8rem,6vw,5.75rem)] font-black uppercase leading-[0.78] tracking-[-0.07em] text-[#e51b4b] drop-shadow-[0_4px_0_#64091f]">
              HOGPOD
            </div>
            <div className="ml-1 text-[clamp(1.6rem,3.2vw,3rem)] font-black uppercase leading-none tracking-[0.18em] text-[#f2c75c] drop-shadow-[0_0_15px_rgba(242,199,92,0.25)]">
              LEGACY
            </div>
            <div className="mt-4 h-0.5 w-44 bg-gradient-to-r from-[#e51b4b] via-[#f2c75c] to-transparent" />
          </div>

          <nav aria-label={t("mainMenu")} className="flex flex-col items-start gap-4">
            <button
              type="button"
              onClick={onStartNewGame}
              className="group flex items-center gap-4 text-left text-[clamp(1.5rem,2.8vw,2.25rem)] font-black leading-none tracking-wide text-white transition-transform hover:translate-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c75c] focus-visible:ring-offset-4 focus-visible:ring-offset-[#050407]"
            >
              <span className="text-[#e51b4b] transition-transform group-hover:rotate-45" aria-hidden="true">
                ✦
              </span>
              <span className="drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]">{t("localGame")}</span>
            </button>

            <button
              type="button"
              onClick={onPlayOnline}
              className="group flex items-center gap-4 text-left text-[clamp(1.5rem,2.8vw,2.25rem)] font-black leading-none tracking-wide text-[#f2c75c] transition-transform hover:translate-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c75c] focus-visible:ring-offset-4 focus-visible:ring-offset-[#050407]"
            >
              <span className="text-[#f2c75c] transition-transform group-hover:rotate-45" aria-hidden="true">
                ✦
              </span>
              <span className="drop-shadow-[0_0_12px_rgba(242,199,92,0.45)]">{t("onlineMultiplayer")}</span>
            </button>
          </nav>

          <p className="mt-16 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 sm:mt-20">
            Chamber of Secrets · 3D Board Game
          </p>
        </div>
      </section>

      <div className="absolute bottom-5 left-6 z-10 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        HOGPOD LEGACY · v1.0
      </div>
      <div className="absolute bottom-5 right-6 z-10 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        Select <span className="ml-1 text-[#e51b4b]">✦</span>
      </div>
    </main>
  );
}
