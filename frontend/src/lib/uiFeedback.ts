export type ToastTone = "info" | "success" | "error";

export type ToastDetail = {
  message: string;
  tone: ToastTone;
};

export const TOAST_EVENT = "langy:toast";

export function notify(message: string, tone: ToastTone = "info") {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, tone } }));
}
