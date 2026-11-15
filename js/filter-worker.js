import { runFilter } from "./particle-filter.js";

self.onmessage = (e) => {
  const { id, bounds } = e.data;
  const { stages } = runFilter(bounds);
  const buffers = [];
  for (const s of stages)
    for (const a of [s.pos, s.nrm, s.fl, s.layer, s.drop]) if (a) buffers.push(a.buffer);
  self.postMessage({ id, run: { stages } }, buffers);
};
