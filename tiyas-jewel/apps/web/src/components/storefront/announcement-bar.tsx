"use client";
import Link from "next/link";
import { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { homepageConfig } from "@/lib/homepage-config";
export function AnnouncementBar() {
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const el = track.current;
    if (el)
      el.scrollBy({
        left: direction * el.clientWidth,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  return (
    <div className="tj-announcement" aria-label="Store information">
      <button aria-label="Previous store announcement" onClick={() => move(-1)}>
        <ChevronLeft size={14} />
      </button>
      <div className="tj-announcement-track" ref={track}>
        {homepageConfig.announcements.map((item, index) => {
          const Icon = [Sparkles, Truck, ShieldCheck][index] ?? Sparkles;
          return (
            <Link key={item.label} href={item.href}>
              <Icon size={14} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
      {homepageConfig.contact && (
        <a
          className="tj-announcement-contact"
          href={homepageConfig.contact.href}
        >
          {homepageConfig.contact.label}
        </a>
      )}
      <button aria-label="Next store announcement" onClick={() => move(1)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
