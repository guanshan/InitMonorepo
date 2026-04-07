import { createRequestId } from "@real-demo/shared";
import { create } from "zustand";

type RequestFeedbackVariant = "error" | "info";

interface RequestFeedbackItem {
  description: string;
  id: string;
  title: string;
  variant: RequestFeedbackVariant;
}

interface RequestFeedbackStore {
  dismiss: (id: string) => void;
  items: RequestFeedbackItem[];
  push: (item: Omit<RequestFeedbackItem, "id">) => void;
}

const FEEDBACK_LIFETIME_MS = 5_000;

export const useRequestFeedbackStore = create<RequestFeedbackStore>((set, get) => ({
  dismiss: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  items: [],
  push: (item) => {
    const id = createRequestId();

    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id,
        },
      ],
    }));

    globalThis.setTimeout(() => {
      get().dismiss(id);
    }, FEEDBACK_LIFETIME_MS);
  },
}));

export const enqueueRequestFeedback = (
  item: Omit<RequestFeedbackItem, "id">,
) => useRequestFeedbackStore.getState().push(item);
