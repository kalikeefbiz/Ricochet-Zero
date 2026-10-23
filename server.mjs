import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let p = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (p === root) p = path.join(root, "index.html");
    if (!p.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(p, (e, b) => {
      if (e) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.setHeader(
        "Content-Type",
        types[path.extname(p)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(b);
    });
  })
  .listen(4173, "0.0.0.0", () =>
    console.log("Ricochet Zero: http://localhost:4173/"),
  );
