# C# syntax to graph tools

## Modules

all parts in this repository are:
* global.json
    * for vscode
* build.ps1
    * build vscode extension
* src/Cs2Dots.Lib
    * main library for C# syntax tree to dot language
* src/Cs2Dots
    * commandline frontend
* src/Cs2DotsWeb
    * web interface
* src/cs-syntax-visualizer
    * extension for visual studio code

## Build requirements

* [dotnet-cli](https://dot.net)
* [node.js(including npm)](https://nodejs.org)
* [Visual Studio Code](https://code.visualstudio.com/)

## Runtime requirements

* [dotnet-cli](https://dot.net)
* [graphviz](http://www.graphviz.org)

## Build

if you want to build,you must install following npm modules in global

* typescript
* vsce

then,execute `build.ps1` by powershell.
build end,you find all built modules are in dist folder