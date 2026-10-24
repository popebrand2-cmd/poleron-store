import Link from "next/link";

// The Iron Maiden exclusive on the home page: a dark red card under the section tiles, the band's logo, the price and the way
// into /iron-maiden, with three of the drop's posters fanned out on the right. Only shown while the drop has pieces.
const FAN = [
  { src: "/iron-maiden/the-trooper.webp", cls: "right-[30%] rotate-[-10deg]" },
  { src: "/iron-maiden/powerslave.webp", cls: "right-[4%] rotate-[9deg]" },
  { src: "/iron-maiden/eddie-londres.webp", cls: "right-[16%] z-[1] rotate-[-1deg] scale-110" },
];

export default function HomeIronBanner({ count, price }: { count: number; price: number }) {
  if (count === 0) return null;
  return (
    <section aria-label="Iron Maiden exclusivo" data-tone="light" className="-mt-px bg-[#f5f5f3]">
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-14">
        <Link
          href="/iron-maiden"
          className="group relative flex min-h-[13rem] overflow-hidden rounded-xl bg-[radial-gradient(90%_120%_at_80%_50%,#8e1820_0%,#3a0a0e_45%,#0a0a0a_100%)] shadow-[0_18px_50px_-24px_rgba(225,29,42,0.9)] ring-1 ring-black/10 sm:min-h-[15rem]"
        >
          {/* Posters fanned out on the right */}
          <span aria-hidden="true" className="absolute inset-y-0 right-0 hidden w-[46%] sm:block">
            {FAN.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.src}
                src={p.src}
                alt=""
                loading="lazy"
                decoding="async"
                className={`absolute top-1/2 h-[82%] w-auto -translate-y-1/2 rounded-md shadow-[0_12px_30px_rgba(0,0,0,0.7)] transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-[54%] ${p.cls}`}
              />
            ))}
          </span>
          {/* Phone: one poster, faded, behind the text */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/iron-maiden/eddie-londres.webp" alt="" aria-hidden="true" loading="lazy" className="absolute -right-6 top-1/2 h-[115%] w-auto -translate-y-1/2 rotate-[8deg] opacity-40 sm:hidden" />

          <span className="relative flex max-w-md flex-col justify-center gap-3 p-5 sm:p-8">
            <span className="inline-flex w-max items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white sm:text-[11px]">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e11d2a]" />
              Exclusivo · Solo en POPE
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/iron-maiden/logo.webp"
              alt="Iron Maiden"
              loading="lazy"
              className="h-auto w-56 sm:w-72"
              style={{ filter: "drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff)" }}
            />
            <span className="text-sm text-white/85 sm:text-base">
              {count} poleras negras con Eddie · desde{" "}
              <span className="font-bold text-white">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(price)}</span>
            </span>
            <span className="inline-flex min-h-11 w-max items-center gap-2 rounded-md bg-[#e11d2a] px-5 font-display text-xl font-bold uppercase leading-none text-white transition group-hover:bg-[#ff2a38]">
              Ver colección <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
