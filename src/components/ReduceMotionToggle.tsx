"use client";

import { useEffect, useState } from "react";
import {
  REDUCE_CHANGE_EVENT,
  chooseReduceMotion,
  initReduceMotion,
  watchReduceMotion,
} from "@/lib/reduceMotion";

export function ReduceMotionToggle() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(initReduceMotion());
    const onSameTab = () => {
      setReduce(document.documentElement.dataset.reduceMotion === "true");
    };
    document.addEventListener(REDUCE_CHANGE_EVENT, onSameTab);
    const unwatch = watchReduceMotion((on) => setReduce(on));
    return () => {
      document.removeEventListener(REDUCE_CHANGE_EVENT, onSameTab);
      unwatch();
    };
  }, []);

  return (
    <button
      type="button"
      aria-pressed={reduce}
      aria-label={`Reduce motion: ${reduce ? "on" : "off"}. Toggle`}
      onClick={() => {
        const next = !reduce;
        setReduce(next);
        chooseReduceMotion(next);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        minHeight: "32px",
        padding: "0 10px",
        background: reduce ? "var(--surface-2)" : "var(--surface)",
        color: "var(--text)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-control)",
        fontSize: "var(--fs-label)",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "18px",
          height: "10px",
          borderRadius: "5px",
          background: reduce ? "var(--accent)" : "var(--line)",
          position: "relative",
          display: "inline-block",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: reduce ? "10px" : "2px",
            width: "6px",
            height: "6px",
            borderRadius: "3px",
            background: reduce ? "var(--surface)" : "var(--text-3)",
            transition: "left 160ms var(--ease-out)",
          }}
        />
      </span>
      Reduce motion
    </button>
  );
}
