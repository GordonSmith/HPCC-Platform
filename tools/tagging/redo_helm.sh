#!/bin/bash
#
# Automatically tag an existing release candidate build as gold
#

function doit()
{
    eval $1
}

function doit2()
{
    eval $1
}

HPCC_MAJOR=9
HPCC_MINOR=8
HPCC_POINT=16
HPCC_SEQUENCE=1
HPCC_SHORT_TAG=$HPCC_MAJOR.$HPCC_MINOR.$HPCC_POINT

HPCC_DIR="/home/gordon/git/hpcc"
doit2 "pushd ~/git/helm-chart 2>&1 > /dev/null"
doit "git fetch origin"
doit "git checkout master"
doit "git merge --ff-only origin/master"
doit "git submodule update --init --recursive"
HPCC_PROJECTS=hpcc-helm
HPCC_NAME=HPCC
if [[ "$HPCC_MAJOR" == "8" ]] && [[ "$HPCC_MINOR" == "10" ]] ; then
    doit "rm -rf ./helm"
    doit "cp -rf $HPCC_DIR/helm ./helm" 
    doit "rm -f ./helm/*.bak" 
    doit "git add -A ./helm"
fi
doit2 "cd docs"
for f in `find ${HPCC_DIR}/helm/examples ${HPCC_DIR}/helm/managed -name Chart.yaml` ; do
    doit "helm package ${f%/*}/ --dependency-update"
done
doit "helm package ${HPCC_DIR}/helm/hpcc/"
doit "helm repo index . --url https://hpcc-systems.github.io/helm-chart"
doit "git add *.tgz"

doit "git commit -a -s -m \"$HPCC_NAME Helm Charts $HPCC_SHORT_TAG-$HPCC_SEQUENCE\""
if [[ "$HPCC_MAJOR" == "8" ]] && [[ "$HPCC_MINOR" == "10" ]] ; then
    doit "git tag $FORCE $HPCC_MAJOR.$HPCC_MINOR.$HPCC_POINT && git push origin $HPCC_MAJOR.$HPCC_MINOR.$HPCC_POINT $FORCE"
fi
# doit "git push origin master $FORCE"
doit2 "popd 2>&1 > /dev/null"
