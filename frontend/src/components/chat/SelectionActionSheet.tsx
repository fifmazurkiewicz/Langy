"use client";

type Props = {
  span: string;
  showCheck: boolean;
  onTranslate: () => void;
  onAdd: () => void;
  onCheck?: () => void;
  onDismiss: () => void;
};

export function SelectionActionSheet({
  span,
  showCheck,
  onTranslate,
  onAdd,
  onCheck,
  onDismiss,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg p-4">
      <div className="classical-card space-y-3 p-4 shadow-lg">
        <p className="font-serif text-lg">{span}</p>
        <div className="flex flex-wrap gap-2">
          {showCheck && onCheck ? (
            <button type="button" className="classical-btn classical-btn-primary" onClick={onCheck}>
              Check
            </button>
          ) : (
            <button type="button" className="classical-btn classical-btn-primary" onClick={onTranslate}>
              Translate
            </button>
          )}
          <button type="button" className="classical-btn" onClick={onAdd}>
            Add to learning
          </button>
          <button type="button" className="classical-btn opacity-70" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
