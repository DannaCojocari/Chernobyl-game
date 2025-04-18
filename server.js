/* Tiny static server so you can run `npm start` */
import express from "express";
import path    from "node:path";
import open    from "open";

const app = express();
const PORT = 3000;

app.use(express.static(path.resolve(".")));

app.listen(PORT, () => {
  console.log(`Chernobyl Explorer running → http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});
