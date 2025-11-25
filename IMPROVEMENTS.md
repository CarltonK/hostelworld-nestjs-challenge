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

### [2025-11-24] Order Creation with Stock Management
**Description:**
Implemented the ability to create orders linked to records, including stock deduction and pricing calculation.

**Motivation:**
- Enable users to place orders for available records
- Prevent overselling by validating and deducting stock atomically

**Technical Changes:**  
- Added Order module including schema, service, controller
- Ensured atomic updates using session.withTransaction()

**Impact:**
- Safe and atomic record stock updates without race conditions
- Prevents invalid orders (e.g., out-of-stock, invalid IDs)

---

## Testing

### [2025-11-25] Implemented Tests
**Description:**
Implemented automated unit tests for all services to ensure correct behavior, error handling and data integrity.

**Motivation:**  
- Ensure services behave as expected under valid and invalid inputs
- Prevent regressions in critical business logic like stock management and caching
- Verify robust error handling for external dependencies (e.g., Redis, MusicBrainz API, database)

**Technical Changes:**  
- Used Jest for unit testing across all services  
- Mocked external dependencies such as Redis, Axios, and Mongoose models  
- Verified proper handling of valid inputs, invalid inputs, missing data, and exceptional cases  
- Ensured key business logic is correctly executed

**Impact:**  
- Increases confidence in service reliability and correctness  
- Prevents regressions during future development  
- Validates error handling and ensures safe interactions with external systems and databases  
- Supports maintainable and testable codebase across the project

### [2025-11-25] Implemented SonarQube Static Code Analysis
**Description:**
Integrated SonarQube for automated static code analysis to ensure code quality, maintainability, and adherence to coding standards across the project.

**Resources:**
- [Sonar Scanner](https://docs.sonarsource.com/sonarqube-server/9.9/analyzing-source-code/scanners/sonarscanner#sonarscanner-from-docker-image)
- [Setup SonarScanner for NestJS](https://gist.github.com/tsabunkar/68bde97f226f8a1640b3ce66c4cf6f73)
- [DockerHub](https://hub.docker.com/_/sonarqube)

**Motivation:**  
- Identify and fix code smells, bugs, and security vulnerabilities early
- Enforce coding standards and maintain a consistent code style
- Improve maintainability and reduce technical debt

**Technical Changes:**  
- Installed and configured SonarQube server and SonarScanner for project analysis
- Configured project quality gates, rules, and metrics for coverage, code duplication, complexity, and security
- Enabled reporting for issues, code smells, and vulnerabilities
- Verified analysis results and remediated critical issues detected by SonarQube

**Impact:**  
- Ensures early detection of bugs, code smells, and potential security issues
- Improves overall code quality and maintainability
- Provides actionable metrics and dashboards for the development team
- Supports long-term project scalability and reduces technical debt

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
