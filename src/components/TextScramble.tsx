"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface TextScrambleProps {
  text: string;
  className?: string;
  speed?: number; // millisecond per character change
  scrambleChars?: string; // Characters used to scramble
  triggerOn?: "hover" | "mount" | "both";
}

export default function TextScramble({
  text,
  className = "",
  speed = 30,
  scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?:",
  triggerOn = "both",
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(text);
  const isAnimating = useRef(false);
  const frameRef = useRef<number | null>(null);
  const queue = useRef<{ from: string; to: string; start: number; end: number; char?: string }[]>([]);
  const frame = useRef(0);

  const resolveText = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    frame.current = 0;

    const newQueue = text.split("").map((char, index) => {
      const from = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
      const to = char;
      const start = Math.floor(Math.random() * 15);
      const end = start + Math.floor(Math.random() * 15) + 10;
      return { from, to, start, end };
    });

    queue.current = newQueue;

    const update = () => {
      let output = "";
      let complete = 0;

      for (let i = 0, n = queue.current.length; i < n; i++) {
        const { from, to, start, end, char } = queue.current[i];
        if (frame.current >= end) {
          complete++;
          output += to;
        } else if (frame.current >= start) {
          if (!char || Math.random() < 0.28) {
            const randomChar = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            queue.current[i].char = randomChar;
            output += `<span class="text-electric-blue font-bold">${randomChar}</span>`;
          } else {
            output += `<span class="text-electric-blue font-bold">${char}</span>`;
          }
        } else {
          output += from;
        }
      }

      // We use innerHTML to display the scrambled characters with specific highlight class
      const container = containerRef.current;
      if (container) {
        container.innerHTML = output;
      }

      if (complete === queue.current.length) {
        isAnimating.current = false;
        setDisplayText(text);
        if (container) {
          container.textContent = text;
        }
      } else {
        frame.current++;
        frameRef.current = requestAnimationFrame(update);
      }
    };

    update();
  }, [text, scrambleChars]);

  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (triggerOn === "mount" || triggerOn === "both") {
      resolveText();
    }
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [resolveText, triggerOn]);

  const handleMouseEnter = () => {
    if (triggerOn === "hover" || triggerOn === "both") {
      resolveText();
    }
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={`inline-block cursor-default font-mono ${className}`}
    >
      {displayText}
    </span>
  );
}
