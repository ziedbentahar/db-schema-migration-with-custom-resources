import fs = require("fs");
import crypto = require("crypto");
import * as path from "path";

const computeDirHash = (dir: string) => {
  //this util function only compute the hash of the high level files on a folder

  const files = fs.readdirSync(dir);

  const fileHashes = files.map((f) => {
    const fileContent = fs.readFileSync(path.join(dir, f), "utf-8");
    var hash = crypto.createHash("sha256").update(fileContent).digest("hex");
    return hash;
  });

  const dirHash = crypto
    .createHash("sha256")
    .update(fileHashes.join())
    .digest("hex");

  return dirHash;
};

export { computeDirHash };
