interface CatBubbleProps {
  message: string;
  visible: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function CatBubble({ message, visible, actionLabel, onAction }: CatBubbleProps) {
  return (
    <div className={`cat-bubble ${visible ? "visible" : ""}`}>
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          className="bubble-action"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onAction();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
