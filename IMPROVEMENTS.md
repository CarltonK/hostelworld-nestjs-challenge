# Improvements Log

A running log of all architectural, performance, and developer-experience improvements made to the Broken Record Store API.

---

## Table of Contents
- [Developer Experience](#developer-experience)
- [Performance](#performance)
- [Architecture](#architecture)
- [Features](#features)
- [Testing](#testing)
- [Infrastructure](#infrastructure)
- [Other Enhancements](#other-enhancements)

---

## Developer Experience

### [2025-11-22] Migrated Package Manager from npm to pnpm
**Description:**  
Replaced npm with pnpm across the entire project to improve installation speed, disk usage efficiency, and deterministic dependency management.

**Resources**
- [Migrating from npm to pnpm](https://britishgeologicalsurvey.github.io/development/migrating-from-npm-to-pnpm/)

**Motivation:**  
- pnpm uses a global content-addressable store, drastically reducing disk space.
- Faster installs and better monorepo support improve developer productivity.
- Ensures consistent lockfile behavior and avoids nested node_modules issues.

**Technical Changes:**  
- Replaced `package-lock.json` with `pnpm-lock.yaml`.
- Updated developer onboarding instructions in README.

**Impact:**  
- Cleaner dependency tree and fewer duplicated packages. 

---

## Performance


---

## Architecture


---

## Features


---

## Testing


---

## Infrastructure


---

## Other Enhancements

