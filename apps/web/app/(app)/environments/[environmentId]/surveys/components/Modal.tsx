import { getPlacementStyle } from "@/app/lib/preview";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@formbricks/lib/cn";
import { TPlacement } from "@formbricks/types/common";

export default function Modal({
  children,
  isOpen,
  placement,
  previewMode,
  highlightBorderColor,
}: {
  children: ReactNode;
  isOpen: boolean;
  placement: TPlacement;
  previewMode: string;
  highlightBorderColor: string | null | undefined;
}) {
  const [show, setShow] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const calculateScaling = () => {
    let scaleValue = "1";

    if (previewMode === "mobile") {
      scaleValue = "1";
    } else {
      if (windowWidth > 1600) {
        scaleValue = "1";
      } else if (windowWidth > 1200) {
        scaleValue = ".9";
      } else if (windowWidth > 900) {
        scaleValue = ".8";
      } else {
        scaleValue = "0.7";
      }
    }

    let placementClass = "";

    if (placement === "bottomLeft") {
      placementClass = "bottom left";
    } else if (placement === "bottomRight") {
      placementClass = "bottom right";
    } else if (placement === "topLeft") {
      placementClass = "top left";
    } else if (placement === "topRight") {
      placementClass = "top right";
    }

    return {
      transform: `scale(${scaleValue})`,
      transformOrigin: placementClass,
    };
  };

  const scalingClasses = calculateScaling();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const highlightBorderColorStyle = useMemo(() => {
    if (!highlightBorderColor)
      return {
        overflow: "auto",
      };

    return {
      border: `2px solid ${highlightBorderColor}`,
      overflow: "auto",
    };
  }, [highlightBorderColor]);

  useEffect(() => {
    setShow(isOpen);
  }, [isOpen]);

  // scroll to top whenever question in modal changes
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, [children]);

  const slidingAnimationClass =
    previewMode === "desktop"
      ? show
        ? "translate-x-0 opacity-100"
        : "translate-x-32 opacity-0"
      : previewMode === "mobile"
        ? show
          ? "bottom-0"
          : "-bottom-full"
        : "";

  return (
    <div aria-live="assertive" className="relative h-full w-full overflow-hidden bg-slate-300">
      <div
        ref={modalRef}
        style={{ ...highlightBorderColorStyle, ...scalingClasses }}
        className={cn(
          "no-scrollbar pointer-events-auto absolute h-fit max-h-[90%] w-full max-w-sm overflow-y-auto rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-500 ease-in-out ",
          previewMode === "desktop" ? getPlacementStyle(placement) : "max-w-full",
          slidingAnimationClass
        )}>
        {children}
      </div>
    </div>
  );
}
