import { create } from 'zustand';

const useLoadingStore = create((set) => ({
    loadingCount: 0,
    increment: () => set((state) => ({ loadingCount: state.loadingCount + 1 })),
    decrement: () => set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) })),
    reset: () => set({ loadingCount: 0 })
}));

export default useLoadingStore;
