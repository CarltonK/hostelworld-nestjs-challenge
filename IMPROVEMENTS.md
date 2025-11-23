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

### [2025-11-22] Migrated to Record Module
**Description**  
Refactored the project structure by isolating all record-related logic into a dedicated `RecordModule` for better organization and separation of concerns.

**Motivation**  
- Improve code structure and maintainability.
- Group related controllers, services and schemas in one module.

**Technical Changes**  
- Created `RecordModule` containing the record controller, service and schemas.
- Moved record-related files into the new module structure.

**Impact**  
- Clearer feature boundaries.

---

## Features

### [2025-11-22] Added Pagination Support to Record Listing

**Description:**  
Introduced pagination to the `findAll` records endpoint, allowing clients to fetch data in smaller, controlled chunks rather than retrieving the entire dataset at once.

**Motivation:**  
- Improve API performance when handling large datasets.
- Reduce MongoDB load by limiting returned documents.
- Provide predictable and efficient client-side navigation through results.

**Technical Changes:**  
- Added `page` and `limit` parameters to `RecordFilterOpts`.
- Implemented skip/limit logic: `skip = (page - 1) * limit`.
- Updated `findAll` query to apply `.skip(skip).limit(limit)`.
- Ensured pagination works seamlessly with all existing filters.

**Impact:**  
- Faster response times for large collections.
- Improved scalability and user experience when browsing records.

### [2025-11-23] Improving search performance
**Description:**
Enhanced the records search endpoint by introducing MongoDB indexing, text search and Redis caching to significantly improve performance on large datasets.

**Resources:**
- [Indexing in Mongoose](https://medium.com/@mansouriyoussef1991/a-comprehensive-guide-to-indexing-in-mongoose-%EF%B8%8F-dcdbd394a320)

**Motivation:**
- Improve search speed for large collections
- Replace regex-based search with MongoDB text search
- Reduce server workload with caching

**Technical Changes:**  
- Added single-field indexes, compound indexes and a text index (`artist`, `album`, `format`, `category`)  
- Reworked search logic to use `$text: { $search: q }`
- Added Redis caching using the integrated Redis client
- Updated return DTO to include typed pagination metadata and records list

**Impact:**
- Faster and more efficient search queries  
- Lower database load due to Redis caching
- Improved scalability and responsiveness across all record queries

### [2025-11-23] MusicBrainz Integration & Tracklist Enrichment
**Description:**
Integrated automatic metadata enrichment using the MusicBrainz API, enabling tracklist retrieval when creating or updating records with a valid MBID. Added XML parsing and schema updates to support enriched metadata.

**Motivation:**
- Automatically populate tracklists to avoid manual entry
- Enrich records with high-quality external metadata
- Improve the accuracy and consistency of stored music data

**Technical Changes:**  
- Added tracklist field to the Record schema and update DTOs
- Implemented MusicBrainzService with XML fetching, XML parsing and a 5-day Redis cache
- Updated create and update flows to fetch tracklists when MBID is provided or changed
- Improved error handling for invalid or missing MBIDs
- Added enrichment logic to extract position, title, duration

**Impact:**
- More complete and useful record entries with automatically generated tracklists
- Reduced external API calls due to Redis caching - Especially to MusicBrainz API which has some limitas
- Faster and more accurate record creation and updates
- Better data consistency across all records

---

## Testing


---

## Infrastructure


---

## Other Enhancements

### [2025-11-22] Introduced NestJS Config Module
**Description**  
Added the NestJS Config Module to replace the previous AppConfig setup and enable runtime validation of environment variables.

**Motivation**  
- Validate environment variables at startup.
- Centralize and simplify configuration management.

**Technical Changes**  
- Added `ConfigModule.forRoot` with Joi validation.
- Removed old AppConfig usage.
- Updated `MongooseModule.forRootAsync` to use `ConfigService`.

**Impact**  
- Safer startup through validated env vars.
- Cleaner and more maintainable config structure.
