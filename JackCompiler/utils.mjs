import fs from "fs";
import path from "path";

export const isDir = (path) => {
  try {
    return fs.lstatSync(path).isDirectory();
  } catch (e) {
    return false;
  }
};

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

export const asyncWalk = (dirPath) => {
  return new Promise((resolve, reject) => {
    return walk(dirPath, (err, result) => {
      return err ? reject(err) : resolve(result);
    });
  });
};

export const last = (arr) => arr[arr.length - 1];

export const NLRTreeTraversal = (node, onNodeVisit) => {
  onNodeVisit(node);

  const leaves = Object.values(node)[0];

  if (Array.isArray(leaves)) {
    leaves.forEach((leaf) => NLRTreeTraversal(leaf, onNodeVisit));
  }
};
