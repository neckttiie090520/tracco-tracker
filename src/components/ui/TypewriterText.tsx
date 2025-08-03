import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  examples: string[]
  className?: string
}

const LETTER_DELAY = 0.025;
const BOX_FADE_DURATION = 0.125;
const FADE_DELAY = 3;
const MAIN_FADE_DURATION = 0.25;
const SWAP_DELAY_IN_MS = 4000;

export const TypewriterText = ({ examples, className = "" }: TypewriterTextProps) => {
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setExampleIndex((pv) => (pv + 1) % examples.length);
    }, SWAP_DELAY_IN_MS);

    return () => clearInterval(intervalId);
  }, [examples.length]);

  return (
    <span className={`${className} leading-relaxed`} style={{ lineHeight: '1.6' }}>
      {examples[exampleIndex].split("").map((l, i) => (
        <motion.span
          key={`${exampleIndex}-${i}`}
          className="relative inline-block"
          style={{ lineHeight: '1.6' }}
        >
          <motion.span
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              delay: i * LETTER_DELAY,
              duration: SWAP_DELAY_IN_MS / 1000,
              times: [0, 0.02, 0.8, 1],
              ease: "easeInOut",
            }}
            className="inline-block"
          >
            {l}
          </motion.span>
          <motion.span
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              delay: i * LETTER_DELAY,
              times: [0, 0.1, 1],
              duration: BOX_FADE_DURATION,
              ease: "easeInOut",
            }}
            className="absolute bottom-[1px] left-[1px] right-0 top-[1px] bg-current"
          />
        </motion.span>
      ))}
    </span>
  );
};