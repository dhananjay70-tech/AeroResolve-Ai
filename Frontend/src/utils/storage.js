const PNR_KEY = "aeroresolve_active_pnr";

export const pnrStorage = {
  get: () => localStorage.getItem(PNR_KEY),
  set: (pnr) => localStorage.setItem(PNR_KEY, pnr),
  clear: () => localStorage.removeItem(PNR_KEY),
};
