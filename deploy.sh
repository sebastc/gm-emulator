#!/bin/bash -xe

git checkout --orphan gh-pages
git --work-tree dist add --all
git --work-tree dist commit -m gh-pages
git push origin HEAD:gh-pages --force
rm -r dist
git checkout -f master
git branch -D gh-pages
