#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export JAVA_HOME="/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"
export NODE_BINARY="/opt/homebrew/bin/node"

# Clean native cache to avoid "react_codegen_rnasyncstorage" errors
rm -rf android/app/.cxx
rm -rf android/app/build

cd android
./gradlew clean assembleRelease --no-daemon -Dorg.gradle.project.node="$NODE_BINARY"
