import fs from "fs";
import path from "path";
import crypto from "crypto";

const walk = function (dir, done) {
  let results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

const asyncWalk = (dirPath) => {
  return new Promise((resolve, reject) => {
    return walk(dirPath, (err, result) => {
      return err ? reject(err) : resolve(result);
    });
  });
};

export const gatherVmFilesContentFromDir = (dirPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const filesInDir = await asyncWalk(dirPath);
      const vmFiles = filesInDir.filter((file) => file.endsWith(".vm"));

      const vmFilesContent = vmFiles.map((file) => {
        return fs.readFileSync(file).toString();
      });

      resolve(vmFilesContent);
    } catch (error) {
      reject(error);
    }
  });
};

export const genId = () => crypto.randomBytes(16).toString("hex");

export const range = (n) => {
  return Array.apply(null, { length: n }).map(Number.call, Number);
};
