import { createContext, useContext } from "react";

export interface AssistantWidgetControls {
  /** False on routes where the full Voice Assistant page is already the assistant. */
  available: boolean;
  open: () => void;
}

export const AssistantWidgetContext = createContext<AssistantWidgetControls | null>(null);

export function useAssistantWidget(): AssistantWidgetControls | null {
  return useContext(AssistantWidgetContext);
}
