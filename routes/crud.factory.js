import { Router } from "express";
export function crudRouter(Model) {
  const r = Router();

  // LIST (con filtros simples, paginado y sort)
  r.get("/", async (req, res) => {
    try {
      const { page = 1, limit = 25, sort = "-createdAt", ...filters } = req.query;
      const skip = (Math.max(+page, 1) - 1) * Math.max(+limit, 1);
      // elimina filtros vacíos
      Object.keys(filters).forEach(k => (filters[k] === "" ? delete filters[k] : null));
      const [items, total] = await Promise.all([
        Model.find(filters).sort(sort).skip(skip).limit(+limit),
        Model.countDocuments(filters)
      ]);
      res.json({ total, page: +page, limit: +limit, items });
    } catch (err) {
      res.status(500).json({ msg: "error listando", error: err.message });
    }
  });

  // GET BY ID
  r.get("/:id", async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ msg: "no encontrado" });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ msg: "id inválido", error: err.message });
    }
  });

  // CREATE
  r.post("/", async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    } catch (err) {
      res.status(400).json({ msg: "error creando", error: err.message });
    }
  });

  // UPDATE
  r.put("/:id", async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true, runValidators: true
      });
      if (!doc) return res.status(404).json({ msg: "no encontrado" });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ msg: "error actualizando", error: err.message });
    }
  });

  // DELETE
  r.delete("/:id", async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ msg: "no encontrado" });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ msg: "error eliminando", error: err.message });
    }
  });

  return r;
}
