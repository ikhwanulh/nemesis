const express = require("express");
const cors = require("cors");
const { CORS_ORIGIN } = require("./config");
const { getBootstrapPayload, getOwnerPackages, getRegionPackages, getProvincePackages } = require("./dashboard-repository");

function resolveCorsOrigin() {
  if (CORS_ORIGIN === "*") {
    return "*";
  }

  return CORS_ORIGIN.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createApp(db) {
  const app = express();

  app.use(
    cors({
      origin: resolveCorsOrigin(),
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/bootstrap", (_req, res) => {
    res.json(getBootstrapPayload(db));
  });

  app.get("/api/regions/:regionKey/packages", (req, res) => {
    const payload = getRegionPackages(db, req.params.regionKey, req.query);

    if (!payload) {
      res.status(404).json({ error: "Region not found" });
      return;
    }

    res.json(payload);
  });

  app.get("/api/provinces/:provinceKey/packages", (req, res) => {
    const payload = getProvincePackages(db, req.params.provinceKey, req.query);

    if (!payload) {
      res.status(404).json({ error: "Province not found" });
      return;
    }

    res.json(payload);
  });

  app.get("/api/owners/packages", (req, res) => {
    const ownerType = (req.query.ownerType || "").trim();
    const ownerName = (req.query.ownerName || "").trim();

    if (!ownerType || !ownerName) {
      res.status(400).json({ error: "ownerType and ownerName are required" });
      return;
    }

    const payload = getOwnerPackages(db, req.query);

    if (!payload) {
      res.status(404).json({ error: "Owner not found" });
      return;
    }

    res.json(payload);
  });

  // Scraper Routes
  const syncManager = require("./scraper/sync-manager");
  const cron = require("node-cron");

  app.post("/api/scraper/sync", (req, res) => {
    if (syncManager.getStatus().isRunning) {
      return res.status(409).json({ error: "Sync already in progress" });
    }
    syncManager.sync(); // Run in background
    res.json({ message: "Sync started", status: syncManager.getStatus() });
  });

  app.get("/api/scraper/status", (req, res) => {
    res.json(syncManager.getStatus());
  });

  // Initialize 24-hour cron job (Runs at 02:00 AM every day)
  cron.schedule("0 2 * * *", () => {
    console.log("Starting scheduled daily sync...");
    syncManager.sync();
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = {
  createApp,
};
