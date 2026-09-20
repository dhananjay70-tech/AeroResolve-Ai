// Mirrors pnrStorage.js. There is no backend "list escalations by PNR"
// endpoint, so the dashboard can only know an escalation exists if the
// frontend remembers its id right after a real escalationApi.create() call.
const PREFIX = "aeroresolve_escalation_";

export const escalationStorage = {
  get: (pnr) => (pnr ? localStorage.getItem(PREFIX + pnr) : null),
  set: (pnr, escalationId) => {
    if (pnr && escalationId) localStorage.setItem(PREFIX + pnr, escalationId);
  },
  clear: (pnr) => {
    if (pnr) localStorage.removeItem(PREFIX + pnr);
  },
};
