import { ChevronDown, ChevronUp, History, Settings } from "lucide-react";
import { useRef, useState } from "react";
import type { CatState } from "../types/paper";
import { CatBubble } from "./CatBubble";

interface CatPetProps {
  state: CatState;
  message: string;
  onOpenLatest: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onContextMenu: () => void;
  canOpenLatest?: boolean;
  dropHandlers: {
    handleDragEnter: (event: React.DragEvent) => void;
    handleDragOver: (event: React.DragEvent) => void;
    handleDragLeave: (event: React.DragEvent) => void;
    handleDrop: (event: React.DragEvent) => void;
  };
}

export function CatPet({
  state,
  message,
  onOpenLatest,
  onOpenHistory,
  onOpenSettings,
  onContextMenu,
  canOpenLatest,
  dropHandlers,
}: CatPetProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startScreenX: number;
    startScreenY: number;
    startWindowX: number;
    startWindowY: number;
    latestScreenX: number;
    latestScreenY: number;
    frame: number | null;
  } | null>(null);
  const pendingPointerRef = useRef<number | null>(null);

  const flushMove = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.frame = null;
    window.paperCat?.setPetPosition(
      drag.startWindowX + drag.latestScreenX - drag.startScreenX,
      drag.startWindowY + drag.latestScreenY - drag.startScreenY,
    );
  };

  const startMove = async (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pendingPointerRef.current = event.pointerId;
    const [startWindowX, startWindowY] = (await window.paperCat?.getPetPosition()) ?? [0, 0];
    if (pendingPointerRef.current !== event.pointerId) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startScreenX: event.screenX,
      startScreenY: event.screenY,
      startWindowX,
      startWindowY,
      latestScreenX: event.screenX,
      latestScreenY: event.screenY,
      frame: null,
    };
  };

  const moveWindow = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    drag.latestScreenX = event.screenX;
    drag.latestScreenY = event.screenY;
    if (drag.frame === null) {
      drag.frame = window.requestAnimationFrame(flushMove);
    }
  };

  const stopMove = (event?: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      if (event && pendingPointerRef.current === event.pointerId) {
        pendingPointerRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }
      return;
    }
    if (event && drag.pointerId !== event.pointerId) return;
    pendingPointerRef.current = null;
    if (drag.frame !== null) {
      window.cancelAnimationFrame(drag.frame);
      flushMove();
    }
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const stopPanelPointer = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const bubbleVisible = state !== "idle" && state !== "sleeping";
  const showViewAction = Boolean(canOpenLatest && state === "success");

  return (
    <main
      className={`pet-stage no-drag state-${state}`}
      onPointerDown={startMove}
      onPointerMove={moveWindow}
      onPointerUp={stopMove}
      onPointerCancel={stopMove}
      onLostPointerCapture={stopMove}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu();
      }}
      {...dropHandlers}
    >
      <CatBubble
        message={message}
        visible={bubbleVisible}
        actionLabel={showViewAction ? "查看" : undefined}
        onAction={showViewAction ? onOpenLatest : undefined}
      />
      <span className="cat-ground" />
      <div className="cat-body" aria-label="PaperCat" role="img">
        <span className="paper-snack" />
        <span className="thought-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="success-sparkles">
          <i />
          <i />
          <i />
        </span>
        <span className="error-tear" />
        <span className="tail">
          <span className="tail-tip" />
        </span>
        <span className="ear left">
          <span className="ear-inner" />
        </span>
        <span className="ear right">
          <span className="ear-inner" />
        </span>
        <span className="forehead-mark" />
        <span className="face">
          <span className="eye left" />
          <span className="eye right" />
          <span className="cheek left" />
          <span className="cheek right" />
          <span className="nose" />
          <span className="mouth" />
          <span className="whisker left one" />
          <span className="whisker left two" />
          <span className="whisker right one" />
          <span className="whisker right two" />
        </span>
        <span className="collar">
          <span className="bell" />
        </span>
        <span className="paw left">
          <span />
        </span>
        <span className="paw right">
          <span />
        </span>
      </div>

      <aside
        className={`pet-drawer ${drawerOpen ? "open" : ""}`}
        onPointerDown={stopPanelPointer}
        onClick={stopPanelPointer}
      >
        <button
          className="drawer-tab"
          type="button"
          title={drawerOpen ? "收起菜单" : "打开菜单"}
          aria-label={drawerOpen ? "收起菜单" : "打开菜单"}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          {drawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="drawer-panel">
          <button type="button" className="drawer-action" onClick={onOpenHistory}>
            <History size={15} />
            <span>历史记录</span>
          </button>
          <button type="button" className="drawer-action" onClick={onOpenSettings}>
            <Settings size={15} />
            <span>设置</span>
          </button>
        </div>
      </aside>
    </main>
  );
}
