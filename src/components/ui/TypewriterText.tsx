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

  // Helper function to properly segment Thai text
  const segmentText = (text: string) => {
    // For Thai text, we'll split by words and spaces to preserve character combinations
    // This prevents breaking Thai vowels and tone marks from their base characters
    return text.split(/(\s+)/).filter(segment => segment.length > 0);
  };

  const segments = segmentText(examples[exampleIndex]);

  return (
    <span 
      className={`${className}`} 
      style={{ 
        lineHeight: '2.2', 
        display: 'inline-block',
        paddingTop: '0.5em',
        paddingBottom: '0.5em'
      }}
    >
      {segments.map((segment, i) => (
        <motion.span
          key={`${exampleIndex}-${i}`}
          className="relative inline-block"
          style={{ 
            lineHeight: '2.2',
            display: 'inline-block',
            verticalAlign: 'top'
          }}
        >
          <motion.span
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              delay: i * LETTER_DELAY * 3, // Slower animation for word segments
              duration: SWAP_DELAY_IN_MS / 1000,
              times: [0, 0.02, 0.8, 1],
              ease: "easeInOut",
            }}
            className="inline-block whitespace-pre"
          >
            {segment}
          </motion.span>
          <motion.span
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              delay: i * LETTER_DELAY * 3,
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