"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, Lightbulb, MessageCircleQuestion, MousePointerClick, Send, ShieldCheck, Volume2, FileText } from "lucide-react";
import { DOCUMENTS, MESSAGES } from "@/data/form";
import { useI18n } from "@/i18n/I18nProvider";
import { loadProgress } from "@/lib/progress";
import { speakItems } from "@/lib/speech";
import AskFawn from "./AskFawn";
import Avatar from "./Avatar";
import MockDoc from "./MockDocs";
import TopBar from "./TopBar";

export default function Landing() {
  const { ui, t, lang } = useI18n();
  const [hasProgress, setHasProgress] = useState(false);

  useEffect(() => {
    try {
      const saved = loadProgress();
      // Read after mount so the server render and first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasProgress(saved.done.length + Object.keys(saved.answers).length > 0);
    } catch {}
  }, []);

  const how = [
    { icon: FileText, title: ui("how1Title"), body: ui("how1Body"), color: "bg-coral" },
    { icon: MousePointerClick, title: ui("how2Title"), body: ui("how2Body"), color: "bg-sun" },
    { icon: MessageCircleQuestion, title: ui("how3Title"), body: ui("how3Body"), color: "bg-mint" },
    { icon: Send, title: ui("how4Title"), body: ui("how4Body"), color: "bg-sky" },
  ];
  const promises = [ui("promise1"), ui("promise2"), ui("promise3"), ui("promise4")];

  const readPage = () =>
    speakItems(
      [
        { text: `${ui("heroTitle")} ${ui("heroBody")}`, label: ui("heroTitle") },
        { text: `${ui("aboutHi")} ${ui("aboutBody1")} ${ui("aboutBody2")}`, label: ui("aboutTitle") },
        { text: `${ui("promiseTitle")}. ${promises.join(" ")}`, label: ui("promiseTitle") },
        { text: `${ui("howTitle")}. ${how.map((h) => `${h.title}. ${h.body}`).join(" ")}`, label: ui("howTitle") },
        {
          text: `${ui("gatherTitle")}. ${DOCUMENTS.map((_, i) => `${t(`d.${i}.name`)}. ${t(`d.${i}.look`)}`).join(" ")}`,
          label: ui("gatherTitle"),
        },
      ],
      lang.code,
    );

  const startLabel = hasProgress ? ui("continueForm") : ui("startForm");

  return (
    <div className="min-h-dvh" dir={lang.rtl ? "rtl" : "ltr"}>
      <TopBar />

      <main>
        {/* Opening */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-10 pt-8 md:grid-cols-[1.15fr_0.85fr] md:pt-14">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-sun px-3.5 py-1 text-[0.95rem] font-bold shadow-[0_2px_0_var(--ink)]">
              <Heart size={16} fill="currentColor" className="text-coral" aria-hidden /> {ui("heroKicker")}
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.05] text-accent-ink sm:text-[3.4rem]">{ui("heroTitle")}</h1>
            <p className="mt-4 max-w-xl text-[1.25rem] leading-relaxed text-ink-2">{ui("heroBody")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/form" className="btn bg-accent px-6 py-4 text-[1.25rem] text-white hover:bg-accent-ink">
                {startLabel} <ArrowRight size={24} aria-hidden className="rtl:rotate-180" />
              </Link>
              <button type="button" onClick={readPage} className="btn bg-white px-5 py-4 text-[1.1rem] hover:bg-sun-soft">
                <Volume2 size={22} aria-hidden /> {ui("readPage")}
              </button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[22rem]">
            <div className="absolute -left-4 top-10 size-24 rounded-full bg-sun/70 blur-0" aria-hidden />
            <div className="absolute -right-2 bottom-16 size-16 rounded-full bg-mint/60" aria-hidden />
            <div className="card relative overflow-hidden bg-sky-soft p-0">
              <Image
                src="/avatar/hero.jpg"
                alt="Dr. Fawn, a friendly deer in a white doctor's coat with a stethoscope"
                width={578}
                height={1120}
                priority
                className="h-[26rem] w-full object-cover object-top sm:h-[30rem]"
              />
              <span className="absolute bottom-4 left-4 rounded-2xl border-2 border-ink bg-white px-3.5 py-2 font-display text-[1.15rem] font-bold shadow-[0_3px_0_var(--ink)]">
                {ui("aboutHi")}
              </span>
            </div>
          </div>
        </section>

        {/* About me */}
        <section id="about" className="mx-auto max-w-6xl px-5 py-8">
          <div className="card grid gap-6 bg-fawn-soft p-6 md:grid-cols-[auto_1fr] md:p-9">
            <Avatar size={128} className="mx-auto md:mx-0" />
            <div>
              <h2 className="font-display text-[2rem] font-bold text-brown">{ui("aboutTitle")}</h2>
              <p className="mt-1 font-display text-[1.3rem] font-semibold">{ui("aboutHi")}</p>
              <p className="mt-3 text-[1.12rem] leading-relaxed text-ink-2">{ui("aboutBody1")}</p>
              <p className="mt-3 text-[1.12rem] leading-relaxed text-ink-2">{ui("aboutBody2")}</p>
              <h3 className="mt-6 font-display text-[1.25rem] font-bold">{ui("promiseTitle")}</h3>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {promises.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 rounded-2xl border-2 border-ink bg-white px-4 py-3 text-[1.02rem]">
                    <ShieldCheck size={22} className="mt-0.5 shrink-0 text-mint-ink" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-8">
          <h2 className="font-display text-[2rem] font-bold text-accent-ink">{ui("howTitle")}</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {how.map((h, i) => (
              <li key={h.title} className="card relative p-5">
                <span className={`grid size-14 place-items-center rounded-2xl border-2 border-ink ${h.color}`}>
                  <h.icon size={28} aria-hidden className="text-ink" />
                </span>
                <span className="absolute right-4 top-4 font-display text-[2.2rem] font-bold text-line">{i + 1}</span>
                <h3 className="mt-4 font-display text-[1.3rem] font-bold">{h.title}</h3>
                <p className="mt-1.5 text-[1.05rem] leading-relaxed text-ink-2">{h.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* What to have ready */}
        <section className="mx-auto max-w-6xl px-5 py-8">
          <h2 className="font-display text-[2rem] font-bold text-accent-ink">{ui("gatherTitle")}</h2>
          <p className="mt-1 text-[1.1rem] text-ink-2">{ui("gatherBody")}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {DOCUMENTS.filter((d) => d.doc).map((d) => {
              const i = DOCUMENTS.indexOf(d);
              return (
                <article key={d.name} className="card flex flex-col p-5">
                  <h3 className="font-display text-[1.3rem] font-bold">{t(`d.${i}.name`)}</h3>
                  <p className="mt-1 text-[1rem] text-ink-2">{t(`d.${i}.why`)}</p>
                  <div className="my-4" aria-hidden>
                    <MockDoc id={d.doc!} compact />
                  </div>
                  <p className="mt-auto text-[1rem] leading-relaxed text-ink-2">
                    <strong className="text-ink">{ui("whatItLooks")}:</strong> {t(`d.${i}.look`)}
                  </p>
                </article>
              );
            })}
          </div>
          <ul className="mt-4 flex flex-wrap gap-3">
            {DOCUMENTS.filter((d) => !d.doc).map((d) => {
              const i = DOCUMENTS.indexOf(d);
              return (
                <li key={d.name} className="rounded-2xl border-2 border-ink bg-white px-4 py-2.5 text-[1rem]">
                  <strong>{t(`d.${i}.name`)}</strong> <span className="text-ink-2">· {t(`d.${i}.why`)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Good to know */}
        <section className="mx-auto max-w-6xl px-5 py-8">
          <div className="card bg-mint-soft p-6 md:p-8">
            <h2 className="flex items-center gap-2 font-display text-[1.6rem] font-bold">
              <Lightbulb size={26} className="text-mint-ink" aria-hidden /> {ui("goodToKnow")}
            </h2>
            <ul className="mt-3 space-y-2">
              {MESSAGES.map((_, i) => (
                <li key={i} className="flex gap-2 text-[1.08rem] leading-relaxed">
                  <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-mint-ink" />
                  {t(`m.${i}`)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-36 pt-6 text-center">
          <Link href="/form" className="btn bg-accent px-8 py-5 text-[1.35rem] text-white hover:bg-accent-ink">
            {startLabel} <ArrowRight size={26} aria-hidden className="rtl:rotate-180" />
          </Link>
        </section>
      </main>

      <AskFawn />
    </div>
  );
}
